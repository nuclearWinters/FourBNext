/**
 * @jest-environment jsdom
 */

import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import Account from './account'
import { trpc } from '../utils/config'

test('loads and displays greeting', async () => {
  const AccountTRPC = trpc.withTRPC(Account)
  render(<AccountTRPC />)

  const text = await screen.findByText('Cuenta')

  expect(text).toBeTruthy()
})