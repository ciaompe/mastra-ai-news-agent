export function generateEmailTemplate(summaries: Array<{
  title: string;
  source: string;
  url: string;
  publishedAt: string;
  summary: string;
}>): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f5f5f5;
    }
    .container {
      background-color: white;
      padding: 30px;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    h1 {
      color: #2c3e50;
      border-bottom: 3px solid #3498db;
      padding-bottom: 10px;
      margin-bottom: 30px;
    }
    .article {
      margin-bottom: 30px;
      padding-bottom: 20px;
      border-bottom: 1px solid #eee;
    }
    .article:last-child {
      border-bottom: none;
    }
    .article-title {
      font-size: 18px;
      font-weight: 600;
      color: #2c3e50;
      margin-bottom: 8px;
    }
    .article-meta {
      font-size: 12px;
      color: #7f8c8d;
      margin-bottom: 12px;
    }
    .article-summary {
      color: #555;
      margin-bottom: 12px;
      line-height: 1.7;
    }
    .read-more {
      display: inline-block;
      color: #3498db;
      text-decoration: none;
      font-weight: 500;
      transition: color 0.2s;
    }
    .read-more:hover {
      color: #2980b9;
      text-decoration: underline;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 2px solid #eee;
      text-align: center;
      font-size: 12px;
      color: #7f8c8d;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>🤖 Daily AI News Digest</h1>
    <p style="color: #7f8c8d; margin-bottom: 30px;">
      ${new Date().toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      })}
    </p>
    <p style="margin-bottom: 30px;">
      Your daily selection of ${summaries.length} new AI and machine learning articles.
    </p>
    
    ${summaries.map((summary, index) => `
      <div class="article">
        <div class="article-title">${index + 1}. ${summary.title}</div>
        <div class="article-meta">
          ${summary.source} • ${new Date(summary.publishedAt).toLocaleDateString('en-US')}
        </div>
        <div class="article-summary">${summary.summary}</div>
        <a href="${summary.url}" class="read-more">Read full article →</a>
      </div>
    `).join('')}
    
    <div class="footer">
      <p>This is your automated AI news digest powered by Mastra.ai</p>
      <p>Stay informed about the latest developments in artificial intelligence.</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}
