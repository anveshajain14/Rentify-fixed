const FASTAPI_BASE_URL =
  process.env.FASTAPI_BASE_URL || process.env.PYTHON_AI_URL || 'http://localhost:8000';

export async function aiChat(req, res) {
  try {
    const resFetch = await fetch(`${FASTAPI_BASE_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: req.body.query }),
    });

    if (!resFetch.ok) {
      const text = await resFetch.text();
      console.error('Python /chat error:', text);
      return res.status(502).json({ message: 'Chat service unavailable' });
    }

    const data = await resFetch.json();
    return res.json(data);
  } catch (err) {
    console.error('Chat proxy error:', err);
    return res.status(500).json({ message: 'Failed to process chat request' });
  }
}

export async function aiSimilar(req, res) {
  const itemId = req.query.itemId;
  const topK = req.query.topK || '8';

  if (!itemId) {
    return res.status(400).json({ message: 'itemId is required' });
  }

  try {
    const resFetch = await fetch(
      `${FASTAPI_BASE_URL}/similar?itemId=${encodeURIComponent(itemId)}&topK=${encodeURIComponent(topK)}`
    );

    if (!resFetch.ok) {
      const text = await resFetch.text();
      console.error('Python /similar error:', text);
      return res.status(502).json({ message: 'Recommendation service unavailable' });
    }

    const data = await resFetch.json();
    return res.json(data);
  } catch (err) {
    console.error('Similar proxy error:', err);
    return res.status(500).json({ message: 'Failed to fetch similar items' });
  }
}

export async function aiSmartAnalyze(req, res) {
  try {
    const mainImage = req.files?.main_image?.[0] || req.files?.main_image;
    const specImage = req.files?.spec_image?.[0] || req.files?.spec_image;

    const main = Array.isArray(mainImage) ? mainImage[0] : mainImage;
    if (!main) {
      return res.status(400).json({ message: 'main_image is required' });
    }

    const FormData = (await import('form-data')).default;
    const proxyForm = new FormData();
    proxyForm.append('main_image', main.buffer, { filename: main.originalname || 'main.jpg' });
    const spec = Array.isArray(specImage) ? specImage[0] : specImage;
    if (spec) {
      proxyForm.append('spec_image', spec.buffer, { filename: spec.originalname || 'spec.jpg' });
    }

    const resFetch = await fetch(`${FASTAPI_BASE_URL}/smart-analyze`, {
      method: 'POST',
      body: proxyForm,
      headers: proxyForm.getHeaders(),
    });

    if (!resFetch.ok) {
      const text = await resFetch.text();
      console.error('Python /smart-analyze error:', text);
      return res.status(502).json({ message: 'Smart analyze service unavailable' });
    }

    const data = await resFetch.json();
    return res.json(data);
  } catch (err) {
    console.error('Smart analyze proxy error:', err);
    return res.status(500).json({ message: 'Failed to process smart analyze request' });
  }
}
