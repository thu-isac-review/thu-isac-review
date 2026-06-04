import { render as renderInstitutionTable } from '../../../components/InstitutionTable/main.js';

export async function render(containerId, context) {
    // 開啟「前台瀏覽模式」：isReadOnly 為 true，隱藏所有編輯按鈕與 Checkbox
    await renderInstitutionTable(containerId, context, { isReadOnly: true });
}
