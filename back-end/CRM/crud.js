import express from "express";
import { supabase } from "./supabaseService.js";

const crudCurator = express.Router();

// ✅ Панель куратора
crudCurator.get("/dashboard", (req, res) => {
  res.sendFile("curator.html", { root: "views" });
});

// 📘 Получить все группы
crudCurator.get("/students", async (req, res) => {
  const { data, error } = await supabase.from("groups").select("*");
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// ➕ Создать новую группу
crudCurator.post("/students", async (req, res) => {
  const { group } = req.body;
  if (!group) return res.status(400).json({ error: "Group name is required" });

  const { data, error } = await supabase
    .from("groups")
    .insert([{ group, students: [], paying_students: 0 }])
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// ➕ Добавить студента в группу
crudCurator.post("/students/:id/add", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { name, paid, phone } = req.body;

  const { data: group, error: groupError } = await supabase
    .from("groups")
    .select("*")
    .eq("id", id)
    .single();

  if (groupError || !group)
    return res.status(404).json({ error: "Group not found" });

  const newStudent = { name, paid: paid === "true", phone };
  const updatedStudents = [...(group.students || []), newStudent];
  const payingCount = updatedStudents.filter((s) => s.paid).length;

  const { error: updateError } = await supabase
    .from("groups")
    .update({ students: updatedStudents, paying_students: payingCount })
    .eq("id", id);

  if (updateError)
    return res.status(500).json({ error: updateError.message });

  res.json({ success: true, student: newStudent });
});


// 📝 Редактировать данные студента
crudCurator.post("/students/:groupId/edit/:studentName", async (req, res) => {
  const groupId = parseInt(req.params.groupId, 10);
  const { studentName } = req.params;
  const { paid, phone } = req.body;

  const { data: group, error } = await supabase
    .from("groups")
    .select("*")
    .eq("id", groupId)
    .single();

  if (error || !group)
    return res.status(404).json({ error: "Group not found" });

  const students = group.students || [];
  const updatedStudents = students.map((s) =>
    s.name === studentName ? { ...s, paid: paid === "true", phone } : s
  );

  const payingCount = updatedStudents.filter((s) => s.paid).length;

  const { error: updateError } = await supabase
    .from("groups")
    .update({ students: updatedStudents, paying_students: payingCount })
    .eq("id", groupId);

  if (updateError)
    return res.status(500).json({ error: updateError.message });

  res.json({ success: true });
});


// ❌ Удалить студента
crudCurator.post("/students/:groupId/delete/:studentName", async (req, res) => {
  const groupId = parseInt(req.params.groupId, 10);
  const { studentName } = req.params;

  const { data: group, error } = await supabase
    .from("groups")
    .select("*")
    .eq("id", groupId)
    .single();

  if (error || !group)
    return res.status(404).json({ error: "Group not found" });

  const updatedStudents = (group.students || []).filter(
    (s) => s.name !== studentName
  );
  const payingCount = updatedStudents.filter((s) => s.paid).length;

  const { error: updateError } = await supabase
    .from("groups")
    .update({ students: updatedStudents, paying_students: payingCount })
    .eq("id", groupId);

  if (updateError)
    return res.status(500).json({ error: updateError.message });

  res.json({ success: true });
});

// 📝 Обновить название группы
crudCurator.post("/students/update-group/:id", async (req, res) => {
  const { id } = req.params;
  const { group } = req.body;

  const { data, error } = await supabase
    .from("groups")
    .update({ group })
    .eq("id", id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true, group: data });
});

// ❌ Удалить группу
crudCurator.post("/students/delete-group/:id", async (req, res) => {
  const { id } = req.params;
  const { error } = await supabase.from("groups").delete().eq("id", id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

export default crudCurator;
