import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ref, nextTick } from 'vue';
import { mount } from '@vue/test-utils';
import Toolbar from '../src/components/caption-studio/Toolbar.vue';
import { useOverflow } from '../src/composables/useOverflow';
import { useRovingTabindex } from '../src/composables/useRovingTabindex';
import type { ToolbarItem } from '../src/composables/useOverflow';

describe('Toolbar - overflow and accessibility', () => {
  let rafBackup: any;

  beforeEach(() => {
    // Make requestAnimationFrame synchronous for deterministic tests
    rafBackup = (global as any).requestAnimationFrame;
    (global as any).requestAnimationFrame = (cb: FrameRequestCallback) => {
      cb(0);
      return 0 as unknown as number;
    };
  });

  afterEach(() => {
    (global as any).requestAnimationFrame = rafBackup;
    vi.restoreAllMocks();
  });

  it('useOverflow moves lowest-priority items into overflow when space is constrained', async () => {
    // Create a fake container with children elements
    const container = document.createElement('div');
    Object.defineProperty(container, 'getBoundingClientRect', {
      value: () => ({ width: 250, height: 40, top: 0, left: 0, right: 250, bottom: 40, x: 0, y: 0, toJSON() {} }),
      writable: true,
    });

    // Items: a (priority 10), b (0), c (0), d (1)
    const items = ref([
      { type: 'action', id: 'a', label: 'A', priority: 10 },
      { type: 'action', id: 'b', label: 'B', priority: 0 },
      { type: 'action', id: 'c', label: 'C', priority: 0 },
      { type: 'action', id: 'd', label: 'D', priority: 1 },
    ]);

    // Create child elements that use the same data-toolbar-id the composable queries
    const widths: Record<string, number> = { a: 100, b: 100, c: 100, d: 100 };

    Object.keys(widths).forEach((id) => {
      const el = document.createElement('div');
      el.dataset.toolbarId = id;
      // mock getBoundingClientRect on each element
      (el as any).getBoundingClientRect = () => ({
        width: widths[id],
        height: 40,
        top: 0,
        left: 0,
        right: widths[id],
        bottom: 40,
        x: 0,
        y: 0,
        toJSON() {},
      });
      container.appendChild(el);
    });

    // Add overflow button stub
    const ovfBtn = document.createElement('button');
    ovfBtn.setAttribute('data-overflow-button', '');
    (ovfBtn as any).getBoundingClientRect = () => ({ width: 40, height: 40, top: 0, left: 0, right: 40, bottom: 40, x:0,y:0, toJSON(){} });
    container.appendChild(ovfBtn);

    // Mount the composable
    const elRef = ref<HTMLElement | null>(container);
    const ctrl = useOverflow(elRef, items, {});

    // Force measurement
    ctrl.remeasure();
    // wait a tick for rAF-driven work
    await nextTick();

    // After measurement, total widths = 400, available = 250 - 40 - 1 = 209
    // Removable sorted ascending priority: b(0), c(0), d(1), a(10)
    // Remove b (400->300), remove c (300->200) -> fits.
    const visibleIds = ctrl.visibleItems.value.map((i) => i.id);
    const overflowIds = ctrl.overflowItems.value.map((i) => i.id);

    expect(visibleIds).toEqual(['a', 'd']);
    expect(overflowIds).toEqual(['b', 'c']);
  });

  it('roving tabindex moves focus with arrow keys', async () => {
    const props = {
      items: [
        { type: 'action', id: 'one', label: 'One' },
        { type: 'action', id: 'two', label: 'Two' },
        { type: 'action', id: 'three', label: 'Three' },
      ],
    } as unknown as { items: ToolbarItem[] };

    const wrapper = mount(Toolbar, {
      props,
      attachTo: document.body,
    });

    await nextTick();

    const nav = wrapper.get('nav');
    // focus first button
    const firstBtn = wrapper.find('button[data-toolbar-id="one"]').element as HTMLElement;
    firstBtn.focus();
    expect(document.activeElement).toBe(firstBtn);

    // Right arrow -> moves focus to second button
    await nav.trigger('keydown', { key: 'ArrowRight' });
    await nextTick();
    const secondBtn = wrapper.find('button[data-toolbar-id="two"]').element as HTMLElement;
    expect(document.activeElement).toBe(secondBtn);

    // Right arrow -> third
    await nav.trigger('keydown', { key: 'ArrowRight' });
    await nextTick();
    const thirdBtn = wrapper.find('button[data-toolbar-id="three"]').element as HTMLElement;
    expect(document.activeElement).toBe(thirdBtn);

    // Home -> first
    await nav.trigger('keydown', { key: 'Home' });
    await nextTick();
    expect(document.activeElement).toBe(firstBtn);

    // End -> last
    await nav.trigger('keydown', { key: 'End' });
    await nextTick();
    expect(document.activeElement).toBe(thirdBtn);

    wrapper.unmount();
  });

  it('overflow button toggles aria-expanded when clicked', async () => {
    const props = {
      items: [
        { type: 'action', id: 'one', label: 'One' },
        { type: 'action', id: 'two', label: 'Two' },
      ],
    } as unknown as { items: ToolbarItem[] };

    const wrapper = mount(Toolbar, {
      props,
      attachTo: document.body,
    });

    await nextTick();

    const btn = wrapper.get('[data-overflow-button]');
    expect(btn.attributes('aria-expanded')).toBe('false');

    await btn.trigger('click');
    await nextTick();
    expect(btn.attributes('aria-expanded')).toBe('true');

    await btn.trigger('click');
    await nextTick();
    expect(btn.attributes('aria-expanded')).toBe('false');

    wrapper.unmount();
  });
});
