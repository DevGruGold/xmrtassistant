# Self-Hosted Piston Deployment Guide

This guide will help you deploy a self-hosted Piston instance with enhanced Python libraries for Eliza.

## Why Self-Host Piston?

The public Piston API only supports standard Python libraries. By self-hosting, you can pre-install:

- **Data Science**: `pandas`, `numpy`, `scipy`, `matplotlib`
- **Web Scraping**: `requests`, `beautifulsoup4`, `lxml`
- **Machine Learning**: `scikit-learn`, `tensorflow` (inference), `torch` (inference)
- **Utilities**: `loguru`, `networkx`, `pillow`
- **And many more...**

## Deployment Options

### Option 1: Render.com (Recommended - Easiest)

1. **Fork the Piston Repository**
   ```bash
   git clone https://github.com/engineer-man/piston
   cd piston
   ```

2. **Create Custom Package Configuration**
   
   Create a file `custom-packages/python/3.10.0/packages.txt`:
   ```
   pandas
   numpy
   scipy
   statsmodels
   requests
   beautifulsoup4
   httpx
   lxml
   scikit-learn
   loguru
   networkx
   pillow
   msgpack
   aiohttp
   ```

3. **Create Dockerfile for Custom Build**
   
   Create `Dockerfile.custom`:
   ```dockerfile
   FROM ghcr.io/engineer-man/piston

   # Install additional Python packages
   RUN apt-get update && apt-get install -y python3-pip

   # Install data science and ML packages
   RUN pip3 install pandas numpy scipy statsmodels matplotlib seaborn \
       requests beautifulsoup4 httpx lxml \
       scikit-learn \
       loguru networkx pillow msgpack aiohttp

   # For lightweight ML inference (optional - increases image size)
   # RUN pip3 install tensorflow-cpu torch torchvision --index-url https://download.pytorch.org/whl/cpu

   EXPOSE 2000
   ```

4. **Deploy to Render**
   - Go to [Render.com](https://render.com)
   - Create new "Web Service"
   - Connect your GitHub repository
   - Use Docker build with `Dockerfile.custom`
   - Set environment variables:
     ```
     PISTON_LOG_LEVEL=INFO
     ```
   - Deploy!

5. **Get Your Piston URL**
   - After deployment, Render will give you a URL like: `https://your-piston-xxxxx.onrender.com`

6. **Add to Supabase Secrets**
   - Go to Supabase Dashboard > Project Settings > Edge Functions > Secrets
   - Add new secret:
     ```
     CUSTOM_PISTON_URL=https://your-piston-xxxxx.onrender.com/api/v2/piston
     ```

### Option 2: Railway.app

1. **Deploy from Template**
   - Go to [Railway.app](https://railway.app)
   - Click "New Project" > "Deploy from GitHub Repo"
   - Search for `engineer-man/piston`
   - Use the same custom Dockerfile approach as above

2. **Configuration**
   - Railway auto-assigns a domain
   - Add `CUSTOM_PISTON_URL` secret to Supabase

### Option 3: DigitalOcean App Platform

1. **Create App**
   - Go to DigitalOcean
   - Create new App
   - Connect GitHub repo with custom Dockerfile

2. **Configure Resources**
   - Select basic plan ($5/month)
   - Set HTTP port to 2000

3. **Deploy and Configure**
   - Get the app URL
   - Add to Supabase secrets

## Testing Your Custom Piston Instance

After deployment, test it:

```bash
curl -X POST https://your-piston-url.com/api/v2/piston/execute \
  -H "Content-Type: application/json" \
  -d '{
    "language": "python",
    "version": "3.10.0",
    "files": [{
      "name": "main.py",
      "content": "import pandas as pd\nimport numpy as np\nprint(f\"Pandas: {pd.__version__}\")\nprint(f\"NumPy: {np.__version__}\")"
    }]
  }'
```

Expected output:
```json
{
  "run": {
    "stdout": "Pandas: 1.5.x\nNumPy: 1.24.x\n",
    "stderr": "",
    "code": 0
  }
}
```

## Cost Estimates

- **Render.com**: 
  - Free tier available (goes to sleep after inactivity)
  - Paid: $7/month (always-on)

- **Railway.app**:
  - $5/month starter
  - Pay-as-you-go usage

- **DigitalOcean**:
  - Basic: $5/month
  - Professional: $12/month

## What This Enables for Eliza

Once deployed, Eliza can:

✅ **Data Analysis**
```python
import pandas as pd
import numpy as np

# Analyze mining statistics
data = pd.DataFrame(mining_stats)
avg_hashrate = data['hashrate'].mean()
```

✅ **Web Scraping**
```python
import requests
from bs4 import BeautifulSoup

response = requests.get('https://example.com')
soup = BeautifulSoup(response.text, 'html.parser')
```

✅ **Machine Learning**
```python
from sklearn.ensemble import RandomForestClassifier
import numpy as np

# Anomaly detection on system metrics
model = RandomForestClassifier()
model.fit(X_train, y_train)
predictions = model.predict(X_test)
```

✅ **Network Analysis**
```python
import networkx as nx

# Build knowledge graph
G = nx.Graph()
G.add_edges_from(entity_relationships)
centrality = nx.degree_centrality(G)
```

## Troubleshooting

### Deployment Fails
- Check Docker build logs
- Ensure sufficient memory (recommended: 1GB+)
- Some ML libraries are large - consider excluding heavy ones like TensorFlow

### Timeout Issues
- Increase execution timeout in python-executor edge function
- For long-running ML tasks, consider async execution

### Package Not Found
- Add package to Dockerfile's pip install command
- Rebuild and redeploy

## Security Notes

- The custom Piston instance should only be accessible via your Supabase edge function
- Consider adding API key authentication if making it public
- Keep the instance updated with security patches

## Next Steps

After deployment:
1. Add `CUSTOM_PISTON_URL` to Supabase secrets
2. Test execution via your app
3. Eliza will automatically use the enhanced environment
4. Monitor usage and costs

---

**Questions or issues?** Check the [Piston documentation](https://github.com/engineer-man/piston) or ask in the XMRT-DAO community.
