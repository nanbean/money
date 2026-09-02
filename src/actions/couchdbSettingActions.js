import PouchDB from 'pouchdb';

import {
	SET_SETTINGS
} from './actionTypes';

import { COUCHDB_URL } from '../constants';
import { missingTransferCategories } from '../utils/transferCategory';
import { renameInPayment } from '../utils/categoryRename';

let settingsDB = new PouchDB('settings');
let settingsSync;

export const initCouchdbSettingAction = username => {
	return async dispatch => {
		let remoteSettingsDB = new PouchDB(`https://${COUCHDB_URL}/settings_${username}`, { skip_setup: true }); // eslint-disable-line camelcase
		settingsSync = settingsDB.sync(remoteSettingsDB, { live: true, retry: true })
			.on('change', function () {
				dispatch(getSettingsAction());
				// handle change
			}).on('paused', function () {
				// replication paused (e.g. replication up to date, user went offline)
			}).on('active', function () {
				// replicate resumed (e.g. new changes replicating, user went back online)
			}).on('denied', function () {
				// a document failed to replicate (e.g. due to permissions)
			}).on('complete', function () {
				// handle complete
			}).on('error', function () {
				// handle error
			});
	};
};

export const finalizeCouchdbSettingAction = () => {
	return async () => {
		settingsSync && settingsSync.cancel();
	};
};

export const getSettingsAction = () => {
	return async dispatch => {
		const settingsResponse = await settingsDB.allDocs({ include_docs: true }); // eslint-disable-line camelcase
		const settings = settingsResponse.rows.map(i => i.doc);

		dispatch({
			type: SET_SETTINGS,
			payload: settings
		});
	};
};

export const updateGeneralAction = (key, value) => {
	return async dispatch => {
		let settingDoc;
		try {
			settingDoc = await settingsDB.get(key);
			settingDoc.value = value;
		} catch (e) {
			if (e.name === 'not_found') {
				settingDoc = {
					_id: key,
					value
				};
			} else {
				throw e;
			}
		}
		await settingsDB.put(settingDoc);
		dispatch(getSettingsAction());
	};
};

export const addCategoryAction = (value) => {
	return async dispatch => {
		const categoryList = await settingsDB.get('categoryList');
		// 같은 이름이 두 번 들어가면 모든 드롭다운에 두 번 나오고, 편집·삭제가
		// 인덱스로 동작하기 때문에 어느 쪽을 고른 건지 알 수 없게 된다.
		if (categoryList.value.includes(value)) return;
		categoryList.value.push(value);
		categoryList.value.sort();
		await settingsDB.put(categoryList);
		dispatch(getSettingsAction());
	};
};

// 계좌 생성 시 '[계좌명]' 이체 카테고리를 채운다. 손으로 추가해야 했던 탓에
// 계좌는 있는데 이체 카테고리가 없는 계좌가 생겼다 (RobinhoodMargin_Cash).
//
// 계좌 삭제 때는 지우지 않는다 — 과거 거래가 그 이름을 참조하고 있어서, 지우면
// 그 이체 내역이 목록·리포트에서 분류 없는 항목이 된다.
// 카테고리 이름 변경을 정기지불에도 반영한다. 예전에는 옮기지 않아서 이름을
// 바꾸면 그 정기지불이 죽은 이름을 가리켰다.
export const renameCategoryInPaymentsAction = (oldName, newName) => {
	return async dispatch => {
		let doc;
		try {
			doc = await settingsDB.get('paymentList');
		} catch (e) {
			if (e.name === 'not_found') return 0;
			throw e;
		}

		let changed = 0;
		doc.value = (doc.value || []).map((payment) => {
			const next = renameInPayment(payment, oldName, newName);
			if (!next) return payment;
			changed += 1;
			return next;
		});

		if (changed > 0) {
			await settingsDB.put(doc);
			dispatch(getSettingsAction());
		}
		return changed;
	};
};

export const ensureTransferCategoriesAction = (accounts) => {
	return async dispatch => {
		const categoryList = await settingsDB.get('categoryList');
		const missing = missingTransferCategories(accounts, categoryList.value);
		if (missing.length === 0) return;

		categoryList.value = [...categoryList.value, ...missing].sort();
		await settingsDB.put(categoryList);
		dispatch(getSettingsAction());
	};
};

// 인덱스가 아니라 이름으로 지목한다.
//
// 예전에는 splice(index, 1) 이었다. addCategoryAction 이 push 후 정렬하기 때문에
// 카테고리가 하나 추가되면 그 뒤 인덱스가 전부 밀린다 ('[가상계좌]' 를 넣으면
// 95개가 +1). PouchDB 동기화 환경에서 다른 기기나 서버 AI 분류가 카테고리를
// 추가하면, 열어둔 대화상자의 낡은 인덱스가 최신 목록에 적용돼 엉뚱한
// 카테고리가 조용히 지워진다.
export const deleteCategoryAction = (name) => {
	return async dispatch => {
		const categoryList = await settingsDB.get('categoryList');
		const index = categoryList.value.indexOf(name);
		if (index < 0) return;
		categoryList.value.splice(index, 1);
		await settingsDB.put(categoryList);
		dispatch(getSettingsAction());
	};
};

// 인덱스가 아니라 옛 이름으로 지목한다 (deleteCategoryAction 과 같은 이유).
export const updateCategoryAction = (oldName, value) => {
	return async dispatch => {
		const categoryList = await settingsDB.get('categoryList');
		const index = categoryList.value.indexOf(oldName);
		if (index < 0) return;
		categoryList.value[index] = value;
		// 이름을 바꾸면 정렬이 깨진다 — 목록은 항상 정렬 상태여야 한다.
		categoryList.value.sort();
		await settingsDB.put(categoryList);

		// If renamed, migrate any custom icon/color mapping from old name to new name
		if (oldName && oldName !== value) {
			try {
				const iconsDoc = await settingsDB.get('categoryIcons');
				if (iconsDoc?.value && iconsDoc.value[oldName]) {
					iconsDoc.value[value] = iconsDoc.value[oldName];
					delete iconsDoc.value[oldName];
					await settingsDB.put(iconsDoc);
				}
			} catch (e) {
				if (e.name !== 'not_found') throw e;
			}
			try {
				const colorsDoc = await settingsDB.get('categoryColors');
				if (colorsDoc?.value && colorsDoc.value[oldName]) {
					colorsDoc.value[value] = colorsDoc.value[oldName];
					delete colorsDoc.value[oldName];
					await settingsDB.put(colorsDoc);
				}
			} catch (e) {
				if (e.name !== 'not_found') throw e;
			}
		}

		dispatch(getSettingsAction());
	};
};

// Stores user-picked icon for a category in settings doc `categoryIcons`.
// Schema: { _id: 'categoryIcons', value: { [categoryName]: iconKey } }
// `iconKey` matches one of CATEGORY_ICON_OPTIONS keys in src/utils/categoryIcon.js.
// Pass `iconKey = null/''` to clear the override (falls back to name-based default).
export const updateCategoryIconAction = (categoryName, iconKey) => {
	return async dispatch => {
		let doc;
		try {
			doc = await settingsDB.get('categoryIcons');
		} catch (e) {
			if (e.name === 'not_found') {
				doc = { _id: 'categoryIcons', value: {} };
			} else {
				throw e;
			}
		}
		const next = { ...(doc.value || {}) };
		if (iconKey) next[categoryName] = iconKey;
		else delete next[categoryName];
		doc.value = next;
		await settingsDB.put(doc);
		dispatch(getSettingsAction());
	};
};

// Stores user-picked color for a category in settings doc `categoryColors`.
// Schema: { _id: 'categoryColors', value: { [categoryName]: hex } }
// Pass `color = null/''` to clear the override (falls back to project default).
export const updateCategoryColorAction = (categoryName, color) => {
	return async dispatch => {
		let doc;
		try {
			doc = await settingsDB.get('categoryColors');
		} catch (e) {
			if (e.name === 'not_found') {
				doc = { _id: 'categoryColors', value: {} };
			} else {
				throw e;
			}
		}
		const next = { ...(doc.value || {}) };
		if (color) next[categoryName] = color;
		else delete next[categoryName];
		doc.value = next;
		await settingsDB.put(doc);
		dispatch(getSettingsAction());
	};
};

export const addPaymentAction = (payment) => {
	return async dispatch => {
		let paymentListDoc;
		try {
			paymentListDoc = await settingsDB.get('paymentList');
		} catch (e) {
			if (e.name === 'not_found') {
				paymentListDoc = { _id: 'paymentList', value: [] };
			} else {
				throw e;
			}
		}
		paymentListDoc.value.push(payment);
		await settingsDB.put(paymentListDoc);
		dispatch(getSettingsAction());
	};
};

export const editPaymentAction = (index, payment) => {
	return async dispatch => {
		const paymentListDoc = await settingsDB.get('paymentList');
		paymentListDoc.value[index] = payment;
		await settingsDB.put(paymentListDoc);
		dispatch(getSettingsAction());
	};
};

export const deletePaymentAction = (index) => {
	return async dispatch => {
		const paymentListDoc = await settingsDB.get('paymentList');
		paymentListDoc.value.splice(index, 1);
		await settingsDB.put(paymentListDoc);
		dispatch(getSettingsAction());
	};
};