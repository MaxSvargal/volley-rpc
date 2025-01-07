import { describe, it, expect, vi } from 'vitest'
import { createRPCClient } from './rpc.client'
import { JsonRpcResponse, RpcError } from './rpc.common'

const mockFetch = vi.fn()

global.fetch = mockFetch

const methods = {
	getData: async (context: { userId: string }, id: string) => {
		if (id === 'error') {
			// throw new Error('Test error')
			throw new RpcError('Test error', 123)
		}
		return { id, userId: context.userId }
	},
	getData2: async (context: { userId: string }, id: string, name: string) => {
		if (id === 'error') {
			// throw new Error('Test error')
			throw new RpcError('Test error', 123)
		}
		return { id, name, userId: context.userId }
	}
}

const client = createRPCClient<typeof methods>({
	url: '/api/rpc'
})

describe('RPC Client', () => {
	beforeEach(() => {
		mockFetch.mockReset()
	})

	it('should call a method and return the result', async () => {
		const response1: JsonRpcResponse = {
			jsonrpc: '2.0',
			result: { id: 'test-id', userId: 'user-123' },
			id: '1'
		}
		const response2: JsonRpcResponse = {
			jsonrpc: '2.0',
			result: { id: 'test-id2', userId: 'user-123' },
			id: '2'
		}
		mockFetch
			.mockResolvedValueOnce({
				ok: true,
				json: async () => response1
			})
			.mockResolvedValueOnce({
				ok: true,
				json: async () => response2
			})

		const result = await client.getData('test-id')
		const result2 = await client.getData('test-id2')

		expect(result).toEqual({ id: 'test-id', userId: 'user-123' })
		expect(result2).toEqual({ id: 'test-id2', userId: 'user-123' })
		expect(mockFetch).toHaveBeenCalledTimes(2)
	})

	it('should handle a method error', async () => {
		const response: JsonRpcResponse = {
			jsonrpc: '2.0',
			error: { code: 123, message: 'Test error' },
			id: '1'
		}
		mockFetch.mockResolvedValueOnce({
			ok: true,
			json: async () => response
		})

		await expect(client.getData('error')).rejects.toThrow(RpcError)
	})

	it('should handle batch requests', async () => {
		const batchResponses: JsonRpcResponse[] = [
			{
				jsonrpc: '2.0',
				result: { id: 'test-id-1', userId: 'user-123' },
				id: '1'
			},
			{
				jsonrpc: '2.0',
				result: { id: 'test-id-2', userId: 'user-123' },
				id: '2'
			}
		]

		mockFetch.mockResolvedValueOnce({
			ok: true,
			json: async () => batchResponses
		})

		const [result1, result2] = await Promise.all([
			client.getData('test-id-1'),
			client.getData('test-id-2')
		])

		expect(result1).toEqual({ id: 'test-id-1', userId: 'user-123' })
		expect(result2).toEqual({ id: 'test-id-2', userId: 'user-123' })

		// Verify that only one fetch call was made
		expect(mockFetch).toHaveBeenCalledTimes(1)
	})

	it('should handle batch requests and a single next', async () => {
		const batchResponses: JsonRpcResponse[] = [
			{
				jsonrpc: '2.0',
				result: { id: 'test-id-1', userId: 'user-123' },
				id: '1'
			},
			{
				jsonrpc: '2.0',
				result: { id: 'test-id-2', userId: 'user-123' },
				id: '2'
			}
		]
		const singleResponse: JsonRpcResponse = {
			jsonrpc: '2.0',
			result: { id: 'test-id-3', userId: 'user-123' },
			id: '3'
		}

		mockFetch
			.mockResolvedValueOnce({
				ok: true,
				json: async () => batchResponses
			})
			.mockResolvedValueOnce({
				ok: true,
				json: async () => singleResponse
			})

		const [result1, result2] = await Promise.all([
			client.getData('test-id-1'),
			client.getData('test-id-2')
		])
		const result3 = await client.getData('test-id-3')

		expect(result1).toEqual({ id: 'test-id-1', userId: 'user-123' })
		expect(result2).toEqual({ id: 'test-id-2', userId: 'user-123' })
		expect(result3).toEqual({ id: 'test-id-3', userId: 'user-123' })

		expect(mockFetch).toHaveBeenCalledTimes(2)
	})

	it('should create message objects correctly', () => {
		const message1 = client.message.getData('test-id-1')
		const message2 = client.message.getData('test-id-2')

		expect(message1).toEqual({ method: 'getData', params: ['test-id-1'] })
		expect(message2).toEqual({ method: 'getData', params: ['test-id-2'] })
	})

	it('should create message objects correctly with sync option', () => {
		const message1 = client.message.getData('test-id-1', { sync: true })
		const message2 = client.message.getData('test-id-2')
		const message3 = client.message.getData2('test-id-3', 'extra-param', { sync: true })

		expect(message1).toEqual({ method: 'getData', params: ['test-id-1'], sync: true })
		expect(message2).toEqual({ method: 'getData', params: ['test-id-2'] })
		expect(message3).toEqual({
			method: 'getData2',
			params: ['test-id-3', 'extra-param'],
			sync: true
		})
	})
})
