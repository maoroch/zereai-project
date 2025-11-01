import express from "express";
import { supabase } from "../services/supabaseService.js";

const crudCurator = express.Router();


// 🔒 Простая система очередей на основе Mutex
class RequestQueue {
  constructor() {
    this.queue = [];
    this.processing = false;
  }

  async add(operation) {
    return new Promise((resolve, reject) => {
      this.queue.push({ operation, resolve, reject });
      this.process();
    });
  }

  async process() {
    if (this.processing || this.queue.length === 0) return;
    
    this.processing = true;
    const { operation, resolve, reject } = this.queue.shift();
    
    try {
      const result = await operation();
      resolve(result);
    } catch (error) {
      reject(error);
    } finally {
      this.processing = false;
      setTimeout(() => this.process(), 0);
    }
  }
}

// Создаем отдельные очереди для разных типов операций
const groupQueue = new RequestQueue(); // Для операций с группами
const studentQueue = new RequestQueue(); // Для операций со студентами

// ✅ Панель куратора
crudCurator.get("/dashboard", (req, res) => {
  res.sendFile("curator.html", { root: "views" });
});

// 📘 Получить все группы (GET запросы не нуждаются в очереди)
crudCurator.get("/students", async (req, res) => {
  const { data, error } = await supabase.from("groups").select("*");
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// ➕ Создать новую группу
crudCurator.post("/students", async (req, res) => {
  try {
    const result = await groupQueue.add(async () => {
      const { group } = req.body;
      if (!group) throw new Error("Group name is required");

      const { data, error } = await supabase
        .from("groups")
        .insert([{ group, students: [], paying_students: 0 }])
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data;
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ➕ Добавить студента в группу
crudCurator.post("/students/:id/add", async (req, res) => {
  try {
    const result = await studentQueue.add(async () => {
      const id = parseInt(req.params.id, 10);
      const { name, paid, phone } = req.body;

      // Получаем актуальные данные группы
      const { data: group, error: groupError } = await supabase
        .from("groups")
        .select("*")
        .eq("id", id)
        .single();

      if (groupError || !group) throw new Error("Group not found");

      const newStudent = { 
        name, 
        paid: paid === "true", 
        phone,
        createdAt: new Date().toISOString() // Добавляем timestamp для отслеживания
      };
      
      const updatedStudents = [...(group.students || []), newStudent];
      const payingCount = updatedStudents.filter((s) => s.paid).length;

      const { error: updateError } = await supabase
        .from("groups")
        .update({ 
          students: updatedStudents, 
          paying_students: payingCount,
          updated_at: new Date().toISOString()
        })
        .eq("id", id);

      if (updateError) throw new Error(updateError.message);

      return { success: true, student: newStudent };
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 📝 Редактировать данные студента
crudCurator.post("/students/:groupId/edit/:studentName", async (req, res) => {
  try {
    const result = await studentQueue.add(async () => {
      const groupId = parseInt(req.params.groupId, 10);
      const { studentName } = req.params;
      const { paid, phone } = req.body;

      const { data: group, error } = await supabase
        .from("groups")
        .select("*")
        .eq("id", groupId)
        .single();

      if (error || !group) throw new Error("Group not found");

      const students = group.students || [];
      const studentExists = students.some(s => s.name === studentName);
      if (!studentExists) throw new Error("Student not found");

      const updatedStudents = students.map((s) =>
        s.name === studentName ? { 
          ...s, 
          paid: paid === "true", 
          phone,
          updatedAt: new Date().toISOString()
        } : s
      );

      const payingCount = updatedStudents.filter((s) => s.paid).length;

      const { error: updateError } = await supabase
        .from("groups")
        .update({ 
          students: updatedStudents, 
          paying_students: payingCount,
          updated_at: new Date().toISOString()
        })
        .eq("id", groupId);

      if (updateError) throw new Error(updateError.message);

      return { success: true };
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ❌ Удалить студента
crudCurator.post("/students/:groupId/delete/:studentName", async (req, res) => {
  try {
    const result = await studentQueue.add(async () => {
      const groupId = parseInt(req.params.groupId, 10);
      const { studentName } = req.params;

      const { data: group, error } = await supabase
        .from("groups")
        .select("*")
        .eq("id", groupId)
        .single();

      if (error || !group) throw new Error("Group not found");

      const updatedStudents = (group.students || []).filter(
        (s) => s.name !== studentName
      );
      const payingCount = updatedStudents.filter((s) => s.paid).length;

      const { error: updateError } = await supabase
        .from("groups")
        .update({ 
          students: updatedStudents, 
          paying_students: payingCount,
          updated_at: new Date().toISOString()
        })
        .eq("id", groupId);

      if (updateError) throw new Error(updateError.message);

      return { success: true };
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 📝 Обновить название группы
crudCurator.post("/students/update-group/:id", async (req, res) => {
  try {
    const result = await groupQueue.add(async () => {
      const { id } = req.params;
      const { group } = req.body;

      const { data, error } = await supabase
        .from("groups")
        .update({ 
          group,
          updated_at: new Date().toISOString()
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return { success: true, group: data };
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ❌ Удалить группу
crudCurator.post("/students/delete-group/:id", async (req, res) => {
  try {
    const result = await groupQueue.add(async () => {
      const { id } = req.params;
      const { error } = await supabase.from("groups").delete().eq("id", id);
      if (error) throw new Error(error.message);
      return { success: true };
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});



export default crudCurator;