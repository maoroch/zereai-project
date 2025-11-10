import express from "express";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";

dotenv.config();
const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production";
const JWT_EXPIRY = "24h";

// ------------------- LOGIN ENDPOINT -------------------
router.post("/login", (req, res) => {
  console.log("=== LOGIN ENDPOINT ===");
  
  const { password } = req.body;

  if (!password) {
    return res.status(400).json({ 
      success: false, 
      error: "Пароль обязателен" 
    });
  }

  const correctPassword = process.env.ADMIN_PASSWORD || "admin123";
  
  if (password !== correctPassword) {
    console.log("❌ Неверный пароль");
    return res.status(401).json({ 
      success: false, 
      error: "Неверный пароль" 
    });
  }

  // ✅ Создаем JWT токен
  const token = jwt.sign(
    {
      role: "admin",
      loginTime: new Date().toISOString(),
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRY }
  );

  console.log("✅ JWT токен создан");

  // Отправляем токен в cookie
  res.cookie("auth_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 24 * 60 * 60 * 1000, // 24 часа
  });

  console.log("✅ Cookie установлена");
  res.json({ 
    success: true, 
    message: "Авторизация успешна",
    token: token // опционально отправляем токен в body тоже
  });
});

// ------------------- CHECK ENDPOINT -------------------
router.get("/check", (req, res) => {
  console.log("=== CHECK ENDPOINT ===");
  
  try {
    // Получаем токен из cookie
    const token = req.cookies?.auth_token;
    
    console.log("Token in cookie:", token ? "✅ YES" : "❌ NO");

    if (!token) {
      console.log("❌ Токен не найден");
      return res.status(401).json({ 
        authenticated: false,
        error: "Токен не найден"
      });
    }

    // Проверяем токен
    const decoded = jwt.verify(token, JWT_SECRET);
    
    console.log("✅ Токен верный, пользователь авторизован");
    
    res.json({ 
      authenticated: true,
      user: {
        role: decoded.role,
        loginTime: decoded.loginTime
      }
    });

  } catch (err) {
    console.error("❌ Ошибка проверки токена:", err.message);
    
    // Если токен истёк или невалидный
    res.status(401).json({ 
      authenticated: false,
      error: "Токен невалидный или истёк"
    });
  }
});

// ------------------- LOGOUT ENDPOINT -------------------
router.post("/logout", (req, res) => {
  console.log("=== LOGOUT ENDPOINT ===");

  // Удаляем cookie
  res.clearCookie("auth_token");
  
  console.log("✅ Cookie удалена");
  res.json({ 
    success: true, 
    message: "Вы вышли из системы" 
  });
});

export default router;