const fs = require('fs');

function extractCredentials() {
  try {
    // 讀取憑證文件
    const keyData = JSON.parse(fs.readFileSync('./service-account-key.json', 'utf8'));
    
    console.log('🔐 提取憑證信息到環境變數格式');
    console.log('=====================================');
    console.log('');
    console.log('請將以下環境變數添加到您的 Zeabur 部署環境中：');
    console.log('');
    console.log('GOOGLE_PROJECT_ID=' + keyData.project_id);
    console.log('GOOGLE_PRIVATE_KEY_ID=' + keyData.private_key_id);
    console.log('GOOGLE_CLIENT_EMAIL=' + keyData.client_email);
    console.log('GOOGLE_CLIENT_ID=' + keyData.client_id);
    console.log('GOOGLE_CLIENT_X509_CERT_URL=' + keyData.client_x509_cert_url);
    console.log('');
    console.log('GOOGLE_PRIVATE_KEY=' + JSON.stringify(keyData.private_key));
    console.log('');
    console.log('📝 注意：');
    console.log('1. 將這些變數添加到 Zeabur 的環境變數設置中');
    console.log('2. 私鑰需要保持完整的換行符格式');
    console.log('3. 刪除本地的 service-account-key.json 文件');
    console.log('4. 更新 .gitignore 確保不會再提交憑證文件');
    
  } catch (error) {
    console.error('❌ 提取憑證失敗:', error.message);
  }
}

extractCredentials(); 