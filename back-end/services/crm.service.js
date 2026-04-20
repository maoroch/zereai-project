import supabase from '../config/db.js';
import { retryOperation } from '../utils/helpers.js';

function assertSupabase() {
  if (!supabase) throw new Error('Supabase is not configured');
}

// ── Groups ───────────────────────────────────────────────────────────────────

export async function getAllGroups() {
  assertSupabase();
  const { data, error } = await supabase.from('groups').select('*');
  if (error) throw new Error(error.message);
  return data;
}

export async function createGroup(groupName) {
  assertSupabase();
  const { data, error } = await supabase
    .from('groups')
    .insert([{ group: groupName, students: [], paying_students: 0 }])
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function updateGroupName(id, groupName) {
  assertSupabase();
  const { data, error } = await supabase
    .from('groups')
    .update({ group: groupName, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function deleteGroup(id) {
  assertSupabase();
  const { error } = await supabase.from('groups').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

// ── Students ─────────────────────────────────────────────────────────────────

async function fetchGroup(id) {
  const { data, error } = await supabase
    .from('groups')
    .select('*')
    .eq('id', id)
    .single();
  if (error || !data) throw new Error('Group not found');
  return data;
}

async function persistStudents(id, students) {
  const payingCount = students.filter((s) => s.paid).length;
  const { error } = await supabase
    .from('groups')
    .update({ students, paying_students: payingCount, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw new Error(error.message);
}

export async function addStudent(groupId, { name, paid, phone }) {
  assertSupabase();
  const group = await fetchGroup(groupId);
  const newStudent = {
    name,
    paid: paid === 'true' || paid === true,
    phone: phone || '',
    createdAt: new Date().toISOString(),
  };
  const students = [...(group.students || []), newStudent];
  await persistStudents(groupId, students);
  return newStudent;
}

export async function editStudent(groupId, studentName, { paid, phone }) {
  assertSupabase();
  const group = await fetchGroup(groupId);
  const students = group.students || [];

  if (!students.some((s) => s.name === studentName)) {
    throw new Error('Student not found');
  }

  const updated = students.map((s) =>
    s.name === studentName
      ? { ...s, paid: paid === 'true' || paid === true, phone, updatedAt: new Date().toISOString() }
      : s
  );

  await persistStudents(groupId, updated);
}

export async function deleteStudent(groupId, studentName) {
  assertSupabase();
  const group = await fetchGroup(groupId);
  const students = (group.students || []).filter((s) => s.name !== studentName);
  await persistStudents(groupId, students);
}

// ── Bulk import ───────────────────────────────────────────────────────────────

export async function bulkInsertGroups(insertData) {
  assertSupabase();
  const { error } = await retryOperation(
    () => supabase.from('groups').insert(insertData),
    'Supabase bulk insert'
  );
  if (error) throw new Error(error.message);
}

export async function exportGroups() {
  assertSupabase();
  const { data, error } = await retryOperation(
    () => supabase.from('groups').select('group, students').order('group'),
    'Supabase groups export'
  );
  if (error) throw new Error(error.message);
  return data;
}
