import { describe, expect, test, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import App from './App.vue'

const originalFetch = globalThis.fetch

describe('App Login Page', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    globalThis.fetch = originalFetch
  })

  test('should show validation error when submit empty form', async () => {
    const wrapper = mount(App)
    await wrapper.get('form').trigger('submit.prevent')
    expect(wrapper.text()).toContain('请输入账号和密码')
  })

  test('should login successfully and render session info', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify({
        ok: true,
        token: 'token-123',
        expiresAt: '2026-12-31T00:00:00.000Z',
        username: 'admin'
      })
    } as Response)

    const wrapper = mount(App)

    await wrapper.get('input[name="username"]').setValue('admin')
    await wrapper.get('input[name="password"]').setValue('pass')
    await wrapper.get('form').trigger('submit.prevent')
    await flushPromises()

    expect(wrapper.text()).toContain('环境 development')
    expect(wrapper.text()).toContain('运行控制台')
    expect(wrapper.text()).toContain('admin')
    expect(wrapper.text()).toContain('该模块内容正在开发中')
    const sessionRaw = localStorage.getItem('neodify.auth.session')
    expect(sessionRaw).toBeTruthy()
  })

  test('should load agent page data after switching to Agent management', async () => {
    globalThis.fetch = vi.fn().mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.endsWith('/auth/login')) {
        return {
          ok: true,
          text: async () =>
            JSON.stringify({
              ok: true,
              token: 'token-123',
              expiresAt: '2026-12-31T00:00:00.000Z',
              username: 'admin'
            })
        } as Response
      }
      if (url.endsWith('/agents')) {
        return {
          ok: true,
          text: async () =>
            JSON.stringify([
              {
                id: 'agent-main',
                name: '主 Agent',
                enabled: true,
                model: 'claude-sonnet-4-5',
                systemPromptMd: '# 你是一个严谨助手',
                temperature: 0.2,
                maxTokens: 4000
              }
            ])
        } as Response
      }
      if (url.endsWith('/agents/agent-main')) {
        return {
          ok: true,
          text: async () =>
            JSON.stringify({
              id: 'agent-main',
              name: '主 Agent',
              enabled: true,
              model: 'claude-sonnet-4-5',
              systemPromptMd: '# 你是一个严谨助手',
              temperature: 0.2,
              maxTokens: 4000,
              skillIds: [],
              mcpIds: []
            })
        } as Response
      }
      if (url.endsWith('/skills') || url.endsWith('/mcps')) {
        return {
          ok: true,
          text: async () => '[]'
        } as Response
      }

      return {
        ok: false,
        text: async () => JSON.stringify({ ok: false, message: 'unknown' })
      } as Response
    })

    const wrapper = mount(App)
    await wrapper.get('input[name="username"]').setValue('admin')
    await wrapper.get('input[name="password"]').setValue('pass')
    await wrapper.get('form').trigger('submit.prevent')
    await flushPromises()

    const navButtons = wrapper.findAll('button.nav-item')
    const agentNavButton = navButtons.find((button) => button.text().includes('Agent 管理'))
    expect(agentNavButton).toBeTruthy()
    await agentNavButton!.trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('Agents')
    expect(wrapper.text()).toContain('agent-main')
  })
})
