export const getAltDigitIndex = (event: KeyboardEvent, maxItems: number) => {
  if (!event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return -1;

  const digitFromKey = /^[1-9]$/.test(event.key) ? event.key : '';
  const digitFromCode = /^Digit([1-9])$/.exec(event.code)?.[1] || '';
  const index = Number(digitFromKey || digitFromCode) - 1;

  return Number.isInteger(index) && index >= 0 && index < maxItems ? index : -1;
};

export const isPlainKeyboardKey = (event: KeyboardEvent, key: string) =>
  !event.altKey &&
  !event.ctrlKey &&
  !event.metaKey &&
  !event.shiftKey &&
  event.key.toLowerCase() === key.toLowerCase();

export const focusFirstMatchingElement = (
  root: ParentNode | null | undefined,
  selectors: string[],
) => {
  const searchRoot = root ?? document;

  for (const selector of selectors) {
    const element = searchRoot.querySelector<HTMLElement>(selector);
    if (!element) continue;

    element.focus({ preventScroll: false });

    if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
      element.select();
    }

    return true;
  }

  return false;
};
