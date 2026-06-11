import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import MatchBadge from "./MatchBadge";
import { formatDistanceToNow } from "date-fns";

const COLUMNS = [
  { id: "applied",    label: "Applied" },
  { id: "screening",  label: "Screening" },
  { id: "interview",  label: "Interview" },
  { id: "offer",      label: "Offer" },
];

function JobCard({ app, index, onClick }) {
  return (
    <Draggable draggableId={String(app.id)} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={() => onClick(app)}
          className={`bg-white rounded-xl border border-gray-200 p-3 cursor-pointer mb-2 transition-shadow ${
            snapshot.isDragging ? "shadow-lg" : "hover:shadow-sm"
          }`}
        >
          <p className="text-xs text-gray-400 mb-0.5">{app.company}</p>
          <p className="text-sm font-medium text-gray-900 leading-snug mb-2">{app.role}</p>
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">
              {formatDistanceToNow(new Date(app.applied_at), { addSuffix: true })}
            </span>
            <MatchBadge score={app.ai_match_score} />
          </div>
        </div>
      )}
    </Draggable>
  );
}

export default function KanbanBoard({ applications, onStatusChange, onCardClick }) {
  function handleDragEnd(result) {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId) return;

    const appId = parseInt(draggableId);
    onStatusChange(appId, destination.droppableId);
  }

  const byStatus = (status) =>
    applications.filter((a) => a.status === status);

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="grid grid-cols-4 gap-4">
        {COLUMNS.map((col) => {
          const cards = byStatus(col.id);
          return (
            <div key={col.id} className="flex flex-col">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  {col.label}
                </span>
                <span className="text-xs bg-gray-100 text-gray-500 rounded-full px-2 py-0.5">
                  {cards.length}
                </span>
              </div>
              <Droppable droppableId={col.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`flex-1 min-h-[120px] rounded-xl p-2 transition-colors ${
                      snapshot.isDraggingOver ? "bg-brand-50 border-2 border-dashed border-brand-300" : "bg-gray-50"
                    }`}
                  >
                    {cards.map((app, index) => (
                      <JobCard
                        key={app.id}
                        app={app}
                        index={index}
                        onClick={onCardClick}
                      />
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          );
        })}
      </div>
    </DragDropContext>
  );
}
