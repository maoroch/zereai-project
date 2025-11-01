import express from "express";
import dotenv from "dotenv";

dotenv.config();
const router = express.Router();

router.post("/login", (req, res) => {
  console.log('=== LOGIN ENDPOINT ===');
  console.log('Session ID before:', req.sessionID);
  console.log('Current session:', req.session);
  console.log('Cookies in request:', req.headers.cookie);

  const { password } = req.body;

  if (!password) {
    return res.status(400).json({ success: false, error: "Пароль обязателен" });
  }

  if (password !== process.env.ADMIN_PASSWORD) {
    console.log('❌ Неверный пароль');
    return res.status(401).json({ success: false, error: "Неверный пароль" });
  }

  // Устанавливаем флаг авторизации
  req.session.authenticated = true;
  req.session.user = { role: 'admin', loginTime: new Date().toISOString() };
  
  console.log('✅ Сессия установлена:', req.session);
  console.log('Session ID после:', req.sessionID);
  
  return res.json({ 
    success: true, 
    message: "Авторизация успешна",
    sessionId: req.sessionID 
  });
});

router.post("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('❌ Ошибка при выходе:', err);
      return res.status(500).json({ success: false, error: "Ошибка выхода" });
    }
    
    // Очищаем cookie
    res.clearCookie('zere.sid');
    res.json({ success: true, message: "Вы вышли" });
  });
});

// Эндпоинт проверки авторизации
router.get("/check", (req, res) => {
  console.log('=== CHECK ENDPOINT ===');
  console.log('Session ID:', req.sessionID);
  console.log('Session data:', req.session);
  console.log('Cookies in request:', req.headers.cookie);
  console.log('Authenticated:', req.session.authenticated);
  
  if (req.session.authenticated) {
    res.json({ 
      authenticated: true,
      user: req.session.user 
    });
  } else {
    res.json({ 
      authenticated: false,
      sessionId: req.sessionID 
    });
  }
});

export default router;