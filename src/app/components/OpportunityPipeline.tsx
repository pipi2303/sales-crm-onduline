import React, { useState } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import { 
  DollarSign, 
  Calendar, 
  User, 
  Edit2, 
  Trash2,
  Building2 
} from 'lucide-react';
import type { Opportunity } from '@/types/opportunity';
import { formatCurrency, formatNumber } from '@/utils/formatters';

interface OpportunityPipelineProps {
  opportunities: Opportunity[];
  onStageChange: (id: string, newStage: string) => void;
  onEdit: (opportunity: Opportunity) => void;
  onDelete: (id: string) => void;
  onView: (opportunity: Opportunity) => void;
}

const stages = [
  { id: 'prospecting', name: 'Prospecting', probability: 30, color: 'bg-blue-100 text-blue-800', borderColor: 'border-blue-300', salesStage: 'Engage' },
  { id: 'proposal', name: 'Proposal', probability: 50, color: 'bg-[#DFF0EC] text-[#012D29]', borderColor: 'border-[#5BB5AB]', salesStage: 'Solution' },
  { id: 'negotiation', name: 'Negotiation', probability: 70, color: 'bg-orange-100 text-orange-800', borderColor: 'border-orange-300', salesStage: 'Align' },
  { id: 'closed-won', name: 'Closed Won', probability: 100, color: 'bg-green-100 text-green-800', borderColor: 'border-green-300', salesStage: 'Execute' },
  { id: 'closed-lost', name: 'Closed Lost', probability: 0, color: 'bg-red-100 text-red-800', borderColor: 'border-red-300', salesStage: 'Close (Win/Loss)' },
];

// Sortable Card Component
function SortableOpportunityCard({ 
  opportunity, 
  onEdit, 
  onDelete,
  onView
}: { 
  opportunity: Opportunity; 
  onEdit: (opp: Opportunity) => void; 
  onDelete: (id: string) => void; 
  onView: (opp: Opportunity) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: opportunity.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <Card 
        className="cursor-move hover:shadow-md transition-all"
        onClick={(e) => {
          // Only trigger view if not clicking on buttons
          const target = e.target as HTMLElement;
          if (!target.closest('button')) {
            onView(opportunity);
          }
        }}
      >
        <CardContent className="p-3 space-y-2">
          {/* Opportunity Name */}
          <h4 className="font-semibold text-sm text-gray-900 line-clamp-2">
            {opportunity.name}
          </h4>

          {/* Client */}
          <div className="flex items-center gap-1 text-xs text-gray-600">
            <Building2 className="w-3 h-3" />
            <span className="truncate">{opportunity.clientName}</span>
          </div>

          {/* Value */}
          <div className="flex items-center gap-1 text-sm font-bold text-[#013E37]">
            <DollarSign className="w-3.5 h-3.5" />
            {formatCurrency(opportunity.totalValue)}
          </div>

          {/* Probability */}
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-gray-200 rounded-full h-1.5">
              <div
                className="bg-[#013E37] h-1.5 rounded-full"
                style={{ width: `${opportunity.probability}%` }}
              />
            </div>
            <span className="text-xs text-gray-600">{opportunity.probability}%</span>
          </div>

          {/* Close Date */}
          <div className="flex items-center gap-1 text-xs text-gray-600">
            <Calendar className="w-3 h-3" />
            {formatDate(opportunity.closeDate)}
          </div>

          {/* Owner */}
          <div className="flex items-center gap-1 text-xs text-gray-600">
            <User className="w-3 h-3" />
            <span className="truncate">{opportunity.ownerName}</span>
          </div>

          {/* Actions */}
          <div className="flex gap-1 pt-2 border-t">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 h-7 text-xs hover:bg-[#EEF7F5] hover:text-[#013E37]"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(opportunity);
              }}
            >
              <Edit2 className="w-3 h-3 mr-1" />
              Edit
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2 hover:bg-red-50 hover:text-red-600"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(opportunity.id);
              }}
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Droppable Column Component
function DroppableColumn({
  stage,
  opportunities,
  onEdit,
  onDelete,
  onView,
  isDragging,
}: {
  stage: typeof stages[0];
  opportunities: Opportunity[];
  onEdit: (opp: Opportunity) => void;
  onDelete: (id: string) => void;
  onView: (opp: Opportunity) => void;
  isDragging: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: stage.id,
  });

  const stageValue = opportunities.reduce((sum, opp) => sum + opp.totalValue, 0);

  return (
    <div className="flex flex-col">
      {/* Stage Header */}
      <div className={`p-4 rounded-t-lg border-2 ${stage.borderColor} bg-gradient-to-b from-white to-gray-50`}>
        <div className="flex items-center justify-between mb-2">
          <div>
            <h3 className="font-bold text-sm text-gray-900">{stage.name}</h3>
            <p className="text-xs text-gray-500 mt-0.5">Sales Stage: {stage.salesStage}</p>
          </div>
          <Badge variant="outline" className="text-xs">
            {stage.probability}%
          </Badge>
        </div>
        <div className="space-y-1">
          <p className="text-xs text-gray-600">{opportunities.length} deals</p>
          <p className="text-sm font-semibold text-gray-900">{formatCurrency(stageValue)}</p>
        </div>
      </div>

      {/* Droppable Area */}
      <SortableContext
        items={opportunities.map(o => o.id)}
        strategy={verticalListSortingStrategy}
      >
        <div 
          ref={setNodeRef}
          className={`flex-1 p-2 min-h-[500px] border-2 ${stage.borderColor} border-t-0 rounded-b-lg transition-all duration-200 ${
            isOver ? 'bg-blue-100 border-blue-400' : isDragging ? 'bg-blue-50/50' : 'bg-gray-50'
          }`}
        >
          <div className="space-y-2">
            {opportunities.map((opportunity) => (
              <SortableOpportunityCard
                key={opportunity.id}
                opportunity={opportunity}
                onEdit={onEdit}
                onDelete={onDelete}
                onView={onView}
              />
            ))}
            {/* Drop here indicator - show when dragging is active */}
            {isDragging && (
              <div className={`flex items-center justify-center min-h-[80px] mt-2 border-2 border-dashed rounded-lg transition-all duration-200 ${
                isOver 
                  ? 'border-blue-500 bg-blue-100' 
                  : 'border-blue-300 bg-blue-50/50'
              }`}>
                <p className={`text-sm font-medium ${isOver ? 'text-blue-700' : 'text-blue-500'}`}>
                  {isOver ? '✓ Drop here' : 'Drop here'}
                </p>
              </div>
            )}
          </div>
        </div>
      </SortableContext>
    </div>
  );
}

export function OpportunityPipeline({ opportunities, onStageChange, onEdit, onDelete, onView }: OpportunityPipelineProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const getOpportunitiesByStage = (stageId: string) => {
    return opportunities.filter(opp => opp.stage === stageId);
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    setActiveId(null);
    
    if (!over) return;
    
    const activeId = active.id as string;
    const overId = over.id as string;
    
    // Check if we're dragging over a stage (find which stage contains the overId)
    const targetStage = stages.find(stage => {
      const stageOpps = getOpportunitiesByStage(stage.id);
      return stageOpps.some(opp => opp.id === overId) || stage.id === overId;
    });
    
    // If we found a target stage and the opportunity isn't already in that stage
    if (targetStage) {
      const opportunity = opportunities.find(opp => opp.id === activeId);
      if (opportunity && opportunity.stage !== targetStage.id) {
        onStageChange(activeId, targetStage.id);
      }
    }
  };

  const handleDragCancel = () => {
    setActiveId(null);
  };

  const activeOpportunity = activeId ? opportunities.find(opp => opp.id === activeId) : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="grid grid-cols-5 gap-4">
        {stages.map((stage) => {
          const stageOpportunities = getOpportunitiesByStage(stage.id);

          return (
            <DroppableColumn
              key={stage.id}
              stage={stage}
              opportunities={stageOpportunities}
              onEdit={onEdit}
              onDelete={onDelete}
              onView={onView}
              isDragging={activeId !== null}
            />
          );
        })}
      </div>

      {/* Drag Overlay */}
      <DragOverlay>
        {activeOpportunity ? (
          <Card className="cursor-move shadow-2xl opacity-90">
            <CardContent className="p-3">
              <h4 className="font-semibold text-sm">{activeOpportunity.name}</h4>
            </CardContent>
          </Card>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}