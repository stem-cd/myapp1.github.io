// ============= 第一部分：引入需要的模块 =============
const express = require('express');      // 用于创建Web服务器
const crypto = require('crypto');        // 用于加密验证
const { exec } = require('child_process'); // 用于执行Git命令

// ============= 第二部分：基本配置 =============
const app = express();                   // 创建Express应用
const PORT = 3000;                       // 服务器端口
const SECRET = 'OzbQYEhEvKcmMauK1FoMSnVPe7oq7PX9Cs05w';       // GitHub Webhook密钥

// ============= 第三部分：设置中间件 =============
app.use(express.json());                 // 让服务器能解析JSON数据

// ============= 第四部分：Android应用调用的API =============
// 这个接口让Android应用可以修改数据
app.post('/update', (req, res) => {
    const newValue = req.body.ch;        // 获取Android发送的新值
    
    // 1. 创建新的JSON数据
    const jsonData = JSON.stringify({
        info: { name: "API", version: "1.0.0" },
        flowers: { ch: newValue }
    }, null, 2);
    
    // 2. 保存到文件
    require('fs').writeFileSync('data.json', jsonData);
    
    // 3. 推送到GitHub
    exec('git add data.json', () => {
        exec(`git commit -m "Update ch to ${newValue}"`, () => {
            exec('git push', () => {
                res.json({ success: true, ch: newValue });
            });
        });
    });
});

// ============= 第五部分：GitHub Webhook接口 =============
// 这个接口让GitHub可以通知我们数据有更新
app.post('/webhook', (req, res) => {
    // 1. 验证请求是否真的来自GitHub
    const signature = req.headers['x-hub-signature-256'];
    const payload = JSON.stringify(req.body);
    
    // 计算正确的签名
    const hmac = crypto.createHmac('sha256', SECRET);
    const correctSignature = 'sha256=' + hmac.update(payload).digest('hex');
    
    // 2. 比较签名
    if (signature !== correctSignature) {
        return res.status(401).send('Invalid');
    }
    
    // 3. 如果是推送事件，拉取最新数据
    if (req.headers['x-github-event'] === 'push') {
        exec('git pull');  // 从GitHub拉取最新代码
    }
    
    res.send('OK');
});

// ============= 第六部分：启动服务器 =============
app.listen(PORT, () => {
    console.log(`✅ 服务器启动：http://localhost:${PORT}`);
    console.log('📱 Android访问：POST http://localhost:3000/update');
    console.log('🔄 GitHub Webhook：POST http://localhost:3000/webhook');
});
