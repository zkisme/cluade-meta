import React, { useState } from 'react';
import { Project, CustomCategory } from '@/types/project';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { GripVertical } from 'lucide-react';
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
}

interface CategoryItem {
  id: string;
  name: string;
}

function SortableCategoryItem({ 
  item, 
  isSelected, 
  onClick 
}: { 
  item: CategoryItem; 
  isSelected: boolean; 
  onClick: () => void;
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
      className="relative"
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
        
        {isSelected && (
          <Badge variant="outline" className="ml-auto">
            已选择
          </Badge>
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
}: CategoryFilterProps) {
  // 获取所有分类并去重
  const allCategories = [
    ...projects.map((project) => project.category),
    ...customCategories.map((cat) => cat.name),
  ];
  const uniqueCategories = Array.from(new Set(allCategories));
  
  // 转换为分类项格式
  const initialItems: CategoryItem[] = uniqueCategories.map((category, index) => ({
    id: `category-${index}`,
    name: category,
  }));
  
  const [items, setItems] = useState<CategoryItem[]>(initialItems);

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