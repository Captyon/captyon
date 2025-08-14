export type ToolbarActionItem = {
  type: 'action';
  id: string;
  label: string;
  icon?: string; // icon name or inline SVG string - Toolbar will accept either but measurement uses rendered node
  onClick?: () => void;
  priority?: number;
  disabled?: boolean;
  tooltip?: string;
};

export type ToolbarToggleItem = {
  type: 'toggle';
  id: string;
  label: string;
  icon?: string;
  modelValue: boolean;
  onUpdate: (v: boolean) => void;
  priority?: number;
  disabled?: boolean;
  tooltip?: string;
};

export type ToolbarMenuItem = {
  type: 'menu';
  id: string;
  label: string;
  icon?: string;
  items: ToolbarItem[];
  priority?: number;
  disabled?: boolean;
  tooltip?: string;
};

export type ToolbarSeparatorItem = {
  type: 'separator';
  id: string;
};

export type ToolbarItem = ToolbarActionItem | ToolbarToggleItem | ToolbarMenuItem | ToolbarSeparatorItem;
