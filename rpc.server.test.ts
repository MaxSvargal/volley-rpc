import { describe, it, expect } from 'vitest'
import { createRPCServer } from './rpc.server'
import { RpcError, JsonRpcRequest } from './rpc.common'

type TestContext = { userId: string }

const methods = {
	getData: async (context: TestContext, id: string) => {
		if (id === 'error') {
			// throw new Error('Test error')
			throw new RpcError('Test error', -32099)
		}
		return { id, userId: context.userId }
	}
}

const rpcServer = createRPCServer<TestContext>(methods)

describe('RPC Server', () => {
	it('should handle a valid request', async () => {
		const request: JsonRpcRequest = {
			jsonrpc: '2.0',
			method: 'getData',
			params: ['test-id'],
			id: '1'
		}
		const context = { userId: 'user-123' }
		const response = await rpcServer.handle(request, context)
		expect(response).toEqual({
			jsonrpc: '2.0',
			result: { id: 'test-id', userId: 'user-123' },
			id: '1'
		})
	})

	it('should handle a method not found error', async () => {
		const request: JsonRpcRequest = {
			jsonrpc: '2.0',
			method: 'unknownMethod',
			params: [],
			id: '1'
		}
		const context = { userId: 'user-123' }
		const response = await rpcServer.handle(request, context)
		expect(response).toEqual({
			jsonrpc: '2.0',
			error: { code: -32601, message: 'Method not found' },
			id: '1'
		})
	})

	it('should handle a method error', async () => {
		const request: JsonRpcRequest = {
			jsonrpc: '2.0',
			method: 'getData',
			params: ['error'],
			id: '1'
		}
		const context = { userId: 'user-123' }
		const response = await rpcServer.handle(request, context)
		expect(response).toEqual({
			jsonrpc: '2.0',
			error: { code: -32099, message: 'Test error' },
			id: '1'
		})
	})

	it('should handle batch requests', async () => {
		const requests: JsonRpcRequest[] = [
			{
				jsonrpc: '2.0',
				method: 'getData',
				params: ['test-id-1'],
				id: '1'
			},
			{
				jsonrpc: '2.0',
				method: 'getData',
				params: ['test-id-2'],
				id: '2'
			}
		]
		const context = { userId: 'user-123' }
		const responses = await rpcServer.handle(requests, context)
		expect(responses).toEqual([
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
		])
	})
})
