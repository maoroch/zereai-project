import * as crmService from '../services/crm.service.js';
import { success, error } from '../utils/apiResponse.js';

// ── Groups ────────────────────────────────────────────────────────────────────

export const getGroups = async (req, res) => {
  const data = await crmService.getAllGroups();
  return success(res, { message: 'Groups fetched', data });
};

export const createGroup = async (req, res) => {
  const { group } = req.body;
  const data = await crmService.createGroup(group);
  return success(res, { message: 'Group created', data }, 201);
};

export const updateGroup = async (req, res) => {
  const { id } = req.params;
  const { group } = req.body;
  const data = await crmService.updateGroupName(id, group);
  return success(res, { message: 'Group updated', data });
};

export const removeGroup = async (req, res) => {
  const { id } = req.params;
  await crmService.deleteGroup(id);
  return success(res, { message: 'Group deleted', data: null });
};

// ── Students ──────────────────────────────────────────────────────────────────

export const addStudent = async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const student = await crmService.addStudent(id, req.body);
  return success(res, { message: 'Student added', data: { student } }, 201);
};

export const editStudent = async (req, res) => {
  const groupId = parseInt(req.params.groupId, 10);
  const { studentName } = req.params;
  await crmService.editStudent(groupId, studentName, req.body);
  return success(res, { message: 'Student updated', data: null });
};

export const deleteStudent = async (req, res) => {
  const groupId = parseInt(req.params.groupId, 10);
  const { studentName } = req.params;
  await crmService.deleteStudent(groupId, studentName);
  return success(res, { message: 'Student deleted', data: null });
};
