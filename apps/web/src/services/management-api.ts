import type { AgentConfig, CreateAgentPayload, McpConfig, SkillConfig } from '../types/management'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api'

interface BaseApiResponse {
  ok?: boolean
  message?: string
}

function buildAuthHeaders(token: string): HeadersInit {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`
  }
}

async function parseApiResponse(response: Response): Promise<unknown> {
  const raw = await response.text()
  if (!raw.trim()) {
    return { ok: response.ok, message: `接口返回空响应（HTTP ${response.status}）` }
  }
  try {
    return JSON.parse(raw)
  } catch {
    return {
      ok: false,
      message: `接口返回了非 JSON 数据（HTTP ${response.status}）`
    }
  }
}

function getErrorMessage(payload: unknown, fallback: string): string {
  if (typeof payload !== 'object' || payload === null) {
    return fallback
  }
  const record = payload as BaseApiResponse
  return record.message ?? fallback
}

export async function listAgents(token: string): Promise<AgentConfig[]> {
  const response = await fetch(`${API_BASE_URL}/agents`, {
    method: 'GET',
    headers: buildAuthHeaders(token)
  })
  const payload = await parseApiResponse(response)
  if (!response.ok) {
    throw new Error(getErrorMessage(payload, `获取 Agent 列表失败（HTTP ${response.status}）`))
  }
  if (!Array.isArray(payload)) {
    throw new Error('获取 Agent 列表失败：响应格式错误')
  }
  return payload as AgentConfig[]
}

export async function listSkills(token: string): Promise<SkillConfig[]> {
  const response = await fetch(`${API_BASE_URL}/skills`, {
    method: 'GET',
    headers: buildAuthHeaders(token)
  })
  const payload = await parseApiResponse(response)
  if (!response.ok) {
    throw new Error(getErrorMessage(payload, `获取 Skill 列表失败（HTTP ${response.status}）`))
  }
  if (!Array.isArray(payload)) {
    throw new Error('获取 Skill 列表失败：响应格式错误')
  }
  return payload as SkillConfig[]
}

export async function listMcps(token: string): Promise<McpConfig[]> {
  const response = await fetch(`${API_BASE_URL}/mcps`, {
    method: 'GET',
    headers: buildAuthHeaders(token)
  })
  const payload = await parseApiResponse(response)
  if (!response.ok) {
    throw new Error(getErrorMessage(payload, `获取 MCP 列表失败（HTTP ${response.status}）`))
  }
  if (!Array.isArray(payload)) {
    throw new Error('获取 MCP 列表失败：响应格式错误')
  }
  return payload as McpConfig[]
}

export async function saveAgent(token: string, input: CreateAgentPayload): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/agents`, {
    method: 'POST',
    headers: buildAuthHeaders(token),
    body: JSON.stringify(input)
  })
  const payload = await parseApiResponse(response)
  if (!response.ok) {
    throw new Error(getErrorMessage(payload, `保存 Agent 失败（HTTP ${response.status}）`))
  }
  if (typeof payload !== 'object' || payload === null) {
    throw new Error('保存 Agent 失败：响应格式错误')
  }
  const record = payload as BaseApiResponse
  if (!record.ok) {
    throw new Error(record.message ?? '保存 Agent 失败')
  }
}

