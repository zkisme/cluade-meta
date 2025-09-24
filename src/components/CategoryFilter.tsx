import React, { useState, useEffect, useMemo } from 'react';
import { Project, CustomCategory } from '@/types/project';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { GripVertical, Trash2, MoreVertical } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface CategoryFilterProps {
  projects: Project[];
  onSelectCategory: (category: string | null) => void;
  selectedCategory: string | null;
  customCategories: CustomCategory[];
  onDeleteCategory?: (categoryName: string) => void;
}

interface CategoryItem {
  id: string;
  name: string;
  isCustom?: boolean;
}

function SortableCategoryItem({ 
  item, 
  isSelected, 
  onClick,
  onDelete,
  hoveredItem,
  setHoveredItem
}: { 
  item: CategoryItem; 
  isSelected: boolean; 
  onClick: () => void;
  onDelete?: () => void;
  hoveredItem: string | null;
  setHoveredItem: (id: string | null) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="relative group"
      onMouseEnter={() => setHoveredItem(item.id)}
      onMouseLeave={() => setHoveredItem(null)}
    >
      <div
        className={`w-full justify-start flex items-center gap-2 transition-all duration-200 p-2 rounded-md cursor-pointer ${
          isSelected 
            ? 'bg-secondary text-secondary-foreground' 
            : 'hover:bg-accent hover:text-accent-foreground'
        } ${isDragging ? 'opacity-50' : ''}`}
        onClick={onClick}
      >
        <div
          {...attributes}
          {...listeners}
          className="p-1 rounded hover:bg-gray-100 text-gray-500 cursor-grab"
        >
          <GripVertical className="h-4 w-4" />
        </div>
        
        <span className="flex-1 text-left">{item.name}</span>
        
        {/* 操作区 - hover时显示 */}
        {item.isCustom && (
          <div className={`opacity-0 group-hover:opacity-100 transition-opacity duration-200 ${
            hoveredItem === item.id ? 'opacity-100' : 'opacity-0'
          }`}>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-red-500 hover:text-red-700 hover:bg-red-50"
              onClick={(e) => {
                e.stopPropagation();
                onDelete?.();
              }}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

export function CategoryFilter({
  projects,
  onSelectCategory,
  selectedCategory,
  customCategories,
  onDeleteCategory,
}: CategoryFilterProps) {
  // 获取所有分类并去重
  const allCategories = useMemo(() => [
    ...projects.map((project) => project.category),
    ...customCategories.map((cat) => cat.name),
  ], [projects, customCategories]);
  
  const uniqueCategories = useMemo(() => Array.from(new Set(allCategories)), [allCategories]);
  
  // 转换为分类项格式
  const initialItems: CategoryItem[] = useMemo(() => uniqueCategories.map((category, index) => ({
    id: `category-${index}`,
    name: category,
    isCustom: customCategories.some(cat => cat.name === category),
  })), [uniqueCategories, customCategories]);
  
  const [items, setItems] = useState<CategoryItem[]>(initialItems);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  // 当分类数据变化时，更新items状态
  useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

  const handleDeleteCategory = (categoryName: string) => {
    if (confirm(`确定要删除分类"${categoryName}"吗？\n\n注意：如果该分类下有项目，将同时删除相关项目记录。`)) {
      onDeleteCategory?.(categoryName);
    }
  };

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (active.id !== over?.id) {
      const oldIndex = items.findIndex(item => item.id === active.id);
      const newIndex = items.findIndex(item => item.id === over?.id);

      const reorderedItems = arrayMove(items, oldIndex, newIndex);
      setItems(reorderedItems);
    }
  }

  return (
    <div className="space-y-2">
      {/* 所有项目按钮 */}
      <div className="mb-4">
        <Button
          variant={selectedCategory === null ? 'secondary' : 'ghost'}
          className="w-full justify-start"
          onClick={() => onSelectCategory(null)}
        >
          所有项目
        </Button>
      </div>

      {/* 分类列表 */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={items.map(item => item.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-1">
            {items.map((item) => (
              <SortableCategoryItem
                key={item.id}
                item={item}
                isSelected={selectedCategory === item.name}
                onClick={() => onSelectCategory(item.name)}
                onDelete={item.isCustom ? () => handleDeleteCategory(item.name) : undefined}
                hoveredItem={hoveredItem}
                setHoveredItem={setHoveredItem}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {/* 空状态 */}
      {items.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <p>暂无分类</p>
          <p className="text-sm">添加项目后会显示分类</p>
        </div>
      )}

      </div>
  );
}