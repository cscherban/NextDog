import { describe, expect, it, vi } from 'vitest';
import { interactiveProps, onActivateKeyDown } from '../a11y';

describe('interactiveProps', () => {
  it('runs the handler on click', () => {
    const onActivate = vi.fn();
    interactiveProps(onActivate).onClick();
    expect(onActivate).toHaveBeenCalledTimes(1);
  });

  it('activates on Enter and Space and prevents the default scroll', () => {
    for (const key of ['Enter', ' ']) {
      const onActivate = vi.fn();
      const preventDefault = vi.fn();
      interactiveProps(onActivate).onKeyDown({ key, preventDefault });
      expect(onActivate).toHaveBeenCalledTimes(1);
      expect(preventDefault).toHaveBeenCalledTimes(1);
    }
  });

  it('ignores other keys', () => {
    const onActivate = vi.fn();
    const preventDefault = vi.fn();
    interactiveProps(onActivate).onKeyDown({ key: 'a', preventDefault });
    expect(onActivate).not.toHaveBeenCalled();
    expect(preventDefault).not.toHaveBeenCalled();
  });
});

describe('onActivateKeyDown', () => {
  it('activates on Enter/Space only', () => {
    const onActivate = vi.fn();
    const preventDefault = vi.fn();
    const handler = onActivateKeyDown(onActivate);

    handler({ key: 'Escape', preventDefault });
    expect(onActivate).not.toHaveBeenCalled();

    handler({ key: 'Enter', preventDefault });
    expect(onActivate).toHaveBeenCalledTimes(1);
    expect(preventDefault).toHaveBeenCalledTimes(1);
  });
});
