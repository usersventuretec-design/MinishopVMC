import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);

export const SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive',
];

const provider = new GoogleAuthProvider();
SCOPES.forEach((scope) => provider.addScope(scope));

const TOKEN_KEY = 'venturetec_google_access_token';
const GIS_USER_KEY = 'venturetec_gis_user';

let isSigningIn = false;
let cachedAccessToken: string | null = typeof window !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null;

declare global {
  interface Window {
    google?: any;
  }
}

export const initAuth = (
  onAuthSuccess?: (user: any, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      const storedToken = cachedAccessToken || (typeof window !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null);
      if (storedToken) {
        cachedAccessToken = storedToken;
        if (onAuthSuccess) onAuthSuccess(user, storedToken);
      } else {
        if (onAuthSuccess) onAuthSuccess(user, '');
      }
    } else {
      // Check if user authenticated via Google Identity Services (GIS fallback)
      const storedGisUser = typeof window !== 'undefined' ? localStorage.getItem(GIS_USER_KEY) : null;
      const storedToken = cachedAccessToken || (typeof window !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null);
      if (storedGisUser && storedToken) {
        try {
          const parsedUser = JSON.parse(storedGisUser);
          if (onAuthSuccess) onAuthSuccess(parsedUser, storedToken);
          return;
        } catch {
          // invalid stored json
        }
      }
      cachedAccessToken = null;
      if (typeof window !== 'undefined') {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(GIS_USER_KEY);
      }
      if (onAuthFailure) onAuthFailure();
    }
  });
};

// Google Identity Services (GIS) fallback token client
export const signInWithGoogleGIS = (): Promise<{ user: any; accessToken: string }> => {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.google?.accounts?.oauth2) {
      return reject(new Error('GIS_NOT_LOADED'));
    }
    try {
      const tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: firebaseConfig.oAuthClientId,
        scope: SCOPES.join(' '),
        callback: async (tokenResponse: any) => {
          if (tokenResponse.error) {
            return reject(new Error(tokenResponse.error_description || tokenResponse.error));
          }
          const accessToken = tokenResponse.access_token;
          if (!accessToken) {
            return reject(new Error('No access token returned from Google'));
          }
          cachedAccessToken = accessToken;
          if (typeof window !== 'undefined') {
            localStorage.setItem(TOKEN_KEY, accessToken);
          }

          let userProfile: any = {
            displayName: 'Google User',
            email: 'user@google.com',
            photoURL: '',
            uid: 'gis_' + Date.now(),
          };

          try {
            const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
              headers: { Authorization: `Bearer ${accessToken}` },
            });
            if (res.ok) {
              const data = await res.json();
              userProfile = {
                displayName: data.name || data.email,
                email: data.email,
                photoURL: data.picture,
                uid: data.sub || 'gis_' + Date.now(),
              };
            }
          } catch (e) {
            console.warn('Could not fetch userinfo via Google token:', e);
          }

          if (typeof window !== 'undefined') {
            localStorage.setItem(GIS_USER_KEY, JSON.stringify(userProfile));
          }

          resolve({ user: userProfile, accessToken });
        },
      });

      tokenClient.requestAccessToken({ prompt: 'consent' });
    } catch (err) {
      reject(err);
    }
  });
};

export const googleSignIn = async (): Promise<{ user: any; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    try {
      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (!credential?.accessToken) {
        throw new Error('Failed to get access token from Google sign-in');
      }

      cachedAccessToken = credential.accessToken;
      if (typeof window !== 'undefined') {
        localStorage.setItem(TOKEN_KEY, credential.accessToken);
      }
      return { user: result.user, accessToken: cachedAccessToken };
    } catch (popupErr: any) {
      const errorCode = popupErr?.code || '';
      if (
        errorCode === 'auth/popup-closed-by-user' ||
        String(popupErr?.message || '').includes('popup-closed-by-user')
      ) {
        return null;
      }
      console.warn('Firebase popup error:', errorCode, popupErr?.message);

      // If Firebase blocked due to unauthorized domain, throw structured domain error
      // DO NOT trigger another popup here because the user gesture has already expired!
      if (
        errorCode === 'auth/unauthorized-domain' ||
        String(popupErr?.message || '').includes('unauthorized-domain')
      ) {
        const domainErr: any = new Error('DOMAIN_UNAUTHORIZED');
        domainErr.code = 'auth/unauthorized-domain';
        domainErr.currentDomain = typeof window !== 'undefined' ? window.location.hostname : '';
        domainErr.projectId = firebaseConfig.projectId;
        throw domainErr;
      }

      throw popupErr;
    }
  } catch (error: any) {
    if (error?.code === 'auth/unauthorized-domain' || error?.message === 'DOMAIN_UNAUTHORIZED') {
      console.info('Firebase auth requires authorized domain setup. Showing guided modal for:', error?.currentDomain);
    } else if (
      error?.code === 'auth/popup-closed-by-user' ||
      String(error?.message || '').includes('popup-closed-by-user')
    ) {
      return null;
    } else {
      console.error('Google Sign-in error:', error);
    }
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  if (cachedAccessToken) return cachedAccessToken;
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem(TOKEN_KEY);
    if (stored) {
      cachedAccessToken = stored;
      return stored;
    }
  }
  return null;
};

export const setAccessTokenManually = (token: string | null, customUser?: any) => {
  cachedAccessToken = token;
  if (typeof window !== 'undefined') {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
      if (customUser) {
        localStorage.setItem(GIS_USER_KEY, JSON.stringify(customUser));
      }
    } else {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(GIS_USER_KEY);
    }
  }
};

export const logout = async () => {
  try {
    await auth.signOut();
  } catch {}
  cachedAccessToken = null;
  if (typeof window !== 'undefined') {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(GIS_USER_KEY);
  }
};
