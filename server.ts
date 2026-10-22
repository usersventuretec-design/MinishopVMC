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

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
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

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
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

// 3. AI Smart Re-order & Up-sell Recommendation for Receipt Creation
app.post('/api/ai/smart-upsell', async (req, res) => {
  try {
    const { customerName, customerPastItems, currentCartItems, catalog } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(503).json({ error: 'GEMINI_API_KEY not configured' });
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: `You are a helpful retail sales assistant for WASABI-O (Venturetec Marketing, Thailand).
Recommend 1 to 3 items from the catalog to cross-sell or re-order for this customer, along with a short, friendly Thai pitch.

Customer Name: ${customerName || 'ลูกค้าทั่วไป'}
Past Purchased Items: ${JSON.stringify(customerPastItems || [])}
Current Cart Items: ${JSON.stringify(currentCartItems || [])}
Available Catalog: ${JSON.stringify(catalog?.map((c: any) => ({ id: c.id, code: c.code, name: c.nameTh, price: c.price, size: c.size })) || [])}

Return ONLY valid JSON matching this schema:
{
  "customerNote": "Short observation in Thai about customer habits or purchase timing",
  "recommendations": [
    {
      "productId": "id from catalog",
      "name": "product name",
      "reason": "Why this product fits (1 short Thai sentence)",
      "pitch": "Short friendly Thai phrase the sales staff can say to the customer"
    }
  ]
}`,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    res.json(parsed);
  } catch (error: any) {
    console.error('AI smart upsell error:', error);
    res.status(500).json({ error: error.message || 'Failed to generate recommendation' });
  }
});

// 4. AI Daily Shift Closing Summary Report (Ready for LINE app)
app.post('/api/ai/daily-shift-report', async (req, res) => {
  try {
    const { date, shiftData } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(503).json({ error: 'GEMINI_API_KEY not configured' });
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: `You are the store supervisor for Venturetec Mini Shop (WASABI-O).
Generate a concise, beautifully formatted Thai summary message ready to be copied into the LINE group for the daily closing shift report.

Date: ${date}
Shift Data: ${JSON.stringify(shiftData)}

Format structure:
📊 สรุปยอดขายประจำวัน (Daily Shift Closing)
📅 วันที่: [Date in Thai format]
🏢 ร้านค้า: Venturetec Mini Shop (WASABI-O)

💰 สรุปยอดเงินปิดกะ:
- 💵 ยอดเงินสดในเก๊ะ: ฿[Amount] ([Count] บิล)
- 💳 โอนเข้าบัญชีกรุงศรี: ฿[Amount] ([Count] บิล)
- 📱 พร้อมเพย์ QR: ฿[Amount] ([Count] บิล)
- 💳 บัตรเครดิต: ฿[Amount] ([Count] บิล)
👉 ยอดขายรวมสุทธิ: ฿[Total Amount] (ทั้งหมด [Total Count] บิล)

🏆 สินค้าขายดีประจำวัน:
[List top items with quantities]

📝 บันทึกเพิ่มเติม & ข้อแนะนำจาก AI:
[1-2 sentences of praise and tomorrow's preparation tip]

Use emojis appropriately for LINE message formatting.`,
    });

    res.json({ report: response.text });
  } catch (error: any) {
    console.error('AI shift report error:', error);
    res.status(500).json({ error: error.message || 'Failed to generate shift report' });
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

  app.listen(Number(port), '0.0.0.0', () => {
    console.log(`Server running on port ${port} (0.0.0.0)`);
  });
}

startServer();
