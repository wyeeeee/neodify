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
})
