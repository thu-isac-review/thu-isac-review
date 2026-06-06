import { state } from './state.js';
import * as UI from './ui.js';
import * as Render from './render.js';
import * as Events from './events.js';
import * as Data from './data.js';

export async function render(containerId, context, options = { isReadOnly: false }) {
    state.db = context.db;
    state.isReadOnly = options.isReadOnly;
    
    const container = document.getElementById(containerId);
    await UI.loadTemplate(containerId);
    
    state.selectedIds = []; 
    state.currentPage = 1; 
    
    UI.applyReadOnlyMode(); 
    Events.bindEvents(container); 
    
    await Data.fetchSettingsOnce();
    await Data.fetchInitialDataOnce();
    
    UI.populateAllFiltersUI();
    UI.updateBatchActionBar();
    Render.renderTable();
}
