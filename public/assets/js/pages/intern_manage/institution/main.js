import { render as renderInstitutionTable } from '../../../components/InstitutionTable/main.js';

export async function render(containerId, context) {
    // 開啟「管理員模式」：isReadOnly 為 false，可以新增、編輯、刪除
    await renderInstitutionTable(containerId, context, { isReadOnly: false });
}
