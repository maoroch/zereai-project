import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

// Добавим проверку переменных окружения
console.log('🔧 Checking environment variables...');
console.log('SUPABASE_URL:', process.env.SUPABASE_URL ? '✅ Set' : '❌ Missing');
console.log('SUPABASE_KEY:', process.env.SUPABASE_KEY ? '✅ Set' : '❌ Missing');

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) {
  throw new Error('Missing Supabase environment variables. Please check your .env file');
}

export const supabase = createClient(
  process.env.SUPABASE_URL, 
  process.env.SUPABASE_KEY, // Используем SERVICE_KEY вместо KEY
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// Функция для тестирования подключения
export const testConnection = async () => {
  try {
    const { data, error } = await supabase
      .from('groups')
      .select('*')
      .limit(1);
    
    if (error) throw error;
    console.log('✅ Supabase connection successful');
    return true;
  } catch (error) {
    console.error('❌ Supabase connection failed:', error.message);
    return false;
  }
};



// --- Авторизация пользователя ---
export const loginUser = async (email, password) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    console.error("❌ Login failed:", error.message);
    throw new Error(error.message);
  }

  console.log("✅ Login successful for:", data.user.email);
  return data;
};