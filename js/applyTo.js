const MINI = require('minified');
const { $, $$, EE } = MINI;

window.applyTo = (selector, command, parameter, on = false, one = false, times = 10) => {
  if ($(selector).length > 0) {
    if (one) on ? $$(selector).on(command, parameter) : $$(selector)[command](parameter);
    else on ? $(selector).on(command, parameter) : $(selector)[command](parameter);
  } else if (times > 0) {
    setTimeout(() => applyTo(selector, command, parameter, on, one, --times), 250);
  }
}