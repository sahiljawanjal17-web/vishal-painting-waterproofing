// Simple State Store
const defaultState = {
  lang: ['en', 'hi', 'mr'].includes(localStorage.getItem('lang')) ? localStorage.getItem('lang') : 'en',
  booking: {
    currentStep: 1,
    values: {}
  }
};

class Store {
  constructor(initialState) {
    this.state = initialState;
  }

  getState() {
    return this.state;
  }

  setState(newState) {
    this.state = { ...this.state, ...newState };
    if (newState.lang) {
      localStorage.setItem('lang', newState.lang);
      window.ebus.emit('lang:changed', { lang: newState.lang });
    }
  }
}

window.store = new Store(defaultState);

