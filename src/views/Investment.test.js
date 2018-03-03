import React from 'react'
import { Provider } from 'react-redux';
import Enzyme, { shallow, mount } from 'enzyme'
import Adapter from 'enzyme-adapter-react-16';
import configureMockStore from 'redux-mock-store'
import thunk from 'redux-thunk'
import { MemoryRouter } from 'react-router'
import ConnectedInvestment, { Investment } from './Investment'

const middlewares = [thunk]
const mockStore = configureMockStore(middlewares)

Enzyme.configure({ adapter: new Adapter() });

describe('async actions', () => {
	const initialState = {
		account: '',
		accountList: [],
		investmentList: [],
		accountInvestments: [],
		investmentAccountTransactions: []
	}
	let store, wrapper

	beforeEach(()=>{
		store = mockStore(initialState)
		wrapper = mount(
			<Provider store={store}>
				<MemoryRouter>
					<ConnectedInvestment />
				</MemoryRouter>
			</Provider>
		)
  })

	it('+++ render the connected(SMART) component', () => {
		expect(wrapper.find(ConnectedInvestment).length).toEqual(1)
	});

	it('+++ check Prop matches with initialState', () => {
		expect(wrapper.find(Investment).prop('account')).toEqual(initialState.account)
	});
})
