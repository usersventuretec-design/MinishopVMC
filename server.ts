import express from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import path from 'path';

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

// 1. AI Parse Order / Address from customer chat
app.post('/api/ai/parse-order', async (req, res) => {
  try {
    const { text, products } = req.body;
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Text is required' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(503).json({ error: 'GEMINI_API_KEY not configured' });
    }

    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: `You are an intelligent order processing assistant for "VENTURETEC MARKETING", seller of WASABI-O authentic Japanese wasabi products in Thailand.
A customer sent an order message via LINE or Facebook chat. Parse this Thai text into clean structured data for receipt creation.

Available Products in Catalog:
${JSON.stringify(products?.map((p: any) => ({ id: p.id, code: p.code, name: p.name, price: p.price })) || [])}

Customer Message:
"""${text}"""

Instructions:
1. Extract customer name, phone number, and delivery address. Clean up any chat labels like "ชื่อ:", "โทร:", "ส่งที่:".
2. Match ordered items against the catalog. Look for keywords (e.g. "วาซาบิสด", "หลอด", "ผงวาซาบิ", "บะหมี่", "โชยุ", "น้ำสลัด"). Set the exact productId, name, quantity, and unitPrice.
3. Identify payment method (TRANSFER, PROMPTPAY, CASH, CREDIT_CARD) if mentioned.
4. Return ONLY a valid JSON object matching this schema without any markdown wrapping:
{
  "customerName": "...",
  "company": "...",
  "phone": "...",
  "address": "...",
  "taxId": "...",
  "email": "...",
  "paymentMethod": "TRANSFER" | "PROMPTPAY" | "CASH" | "CREDIT_CARD",
  "matchedItems": [
    {
      "productId": "...",
      "description": "...",
      "quantity": 1,
      "unitPrice": 100
    }
  ],
  "remarks": "..."
}`,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    res.json(parsed);
  } catch (error: any) {
    console.error('AI parse order error:', error);
    res.status(500).json({ error: error.message || 'Failed to parse order with AI' });
  }
});

// 2. AI Sales Insights & Recommendations
app.post('/api/ai/sales-insights', async (req, res) => {
  try {
    const { summaryData } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(503).json({ error: 'GEMINI_API_KEY not configured' });
    }

    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: `You are a senior retail sales advisor for VENTURETEC MARKETING (WASABI-O products Thailand).
Analyze the following sales summary data and provide 3-4 concise, highly actionable recommendations in Thai for the shop manager to boost WASABI-O sales and customer retention.

Data:
${JSON.stringify(summaryData)}

Format your response in Thai markdown with clean headings:
1. 📈 สรุปภาพรวมผลการดำเนินงาน (Executive Summary)
2. ⭐ สินค้าขายดีและโอกาสต่อยอด (Top Selling Products & Growth Opportunities)
3. 💡 ไอเดียโปรโมชั่นและจัดเซ็ตกระตุ้นยอดขาย (Actionable Promo & Bundle Strategies)
4. 🎯 คำแนะนำการบริการลูกค้า (Customer Care & Repeat Purchase Tips)
Keep the tone professional, encouraging, and focused on WASABI-O sales success.`,
    });

    res.json({ insights: response.text });
  } catch (error: any) {
    console.error('AI sales insights error:', error);
    res.status(500).json({ error: error.message || 'Failed to generate insights' });
  }
});

async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
}

startServer();
