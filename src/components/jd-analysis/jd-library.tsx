"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { formatDate, scoreColor } from "@/lib/utils";
import {
  Search,
  Trash2,
  LayoutGrid,
  List,
  ArrowUpDown,
  ChevronDown,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MatchReport } from "@/components/jd-analysis/match-report";

type Analysis = {
  id: string;
  title: string;
  company: string | null;
  matchScore: number | null;
  requiredSkills: unknown;
  preferredSkills: unknown;
  missingSkills: unknown;
  recommendations: unknown;
  createdAt: string;
};

function toStringArray(val: unknown): string[] {
  if (Array.isArray(val)) return val.map(String);
  return [];
}

type SortKey = "date" | "score";

export function JDLibrary({ analyses }: { analyses: Analysis[] }) {
  const router = useRouter();
  const [items, setItems] = useState<Analysis[]>(analyses);
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    let list = items.filter(
      (a) =>
        !q ||
        a.title.toLowerCase().includes(q) ||
        (a.company && a.company.toLowerCase().includes(q)),
    );
    list.sort((a, b) => {
      if (sortKey === "score") {
        return (b.matchScore ?? 0) - (a.matchScore ?? 0);
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
    return list;
  }, [items, query, sortKey]);

  const selected = items.find((a) => a.id === selectedId) ?? null;

  async function handleDelete() {
    if (!deleteId) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/jd-analyze/${deleteId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        toast.error("Failed to delete analysis.");
        return;
      }
      setItems((prev) => prev.filter((a) => a.id !== deleteId));
      if (selectedId === deleteId) setSelectedId(null);
      toast.success("Analysis deleted.");
    } catch {
      toast.error("Failed to delete analysis.");
    } finally {
      setDeleting(false);
      setDeleteId(null);
    }
  }

  function openResumeOptimizer(a: Analysis) {
    const params = new URLSearchParams({
      jdId: a.id,
      title: a.title,
    });
    if (a.company) params.set("company", a.company);
    router.push(`/jd-analysis?tab=optimize&${params.toString()}`);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by title or company..."
            className="pl-9"
          />
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="outline" size="sm" className="gap-1.5" />
            }
          >
            <ArrowUpDown className="size-3.5" />
            {sortKey === "date" ? "Date" : "Score"}
            <ChevronDown className="size-3" />
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => setSortKey("date")}>
              Newest first
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setSortKey("score")}>
              Highest match score
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="flex rounded-lg border">
          <Button
            variant={viewMode === "grid" ? "secondary" : "ghost"}
            size="icon-sm"
            onClick={() => setViewMode("grid")}
          >
            <LayoutGrid className="size-3.5" />
          </Button>
          <Button
            variant={viewMode === "list" ? "secondary" : "ghost"}
            size="icon-sm"
            onClick={() => setViewMode("list")}
          >
            <List className="size-3.5" />
          </Button>
        </div>
      </div>

      {filtered.length === 0 && (
        <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          {items.length === 0
            ? "No saved analyses yet. Analyze a job description to get started."
            : "No analyses match your search."}
        </div>
      )}

      {viewMode === "grid" ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((a) => (
            <Card
              key={a.id}
              className="cursor-pointer transition-colors hover:border-primary/40"
              onClick={() => setSelectedId(a.id)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <CardTitle className="truncate text-sm font-semibold">
                      {a.title}
                    </CardTitle>
                    {a.company && (
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {a.company}
                      </p>
                    )}
                  </div>
                  <div
                    className="shrink-0 rounded-md px-2 py-0.5 text-xs font-bold tabular-nums"
                    style={{
                      color: scoreColor(a.matchScore ?? 0),
                      backgroundColor: `color-mix(in srgb, ${scoreColor(a.matchScore ?? 0)} 12%, transparent)`,
                    }}
                  >
                    {Math.round(a.matchScore ?? 0)}%
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex flex-wrap gap-1 mb-3">
                  {toStringArray(a.requiredSkills)
                    .slice(0, 3)
                    .map((s) => (
                      <Badge key={s} variant="secondary" className="text-[10px]">
                        {s}
                      </Badge>
                    ))}
                  {toStringArray(a.requiredSkills).length > 3 && (
                    <Badge variant="outline" className="text-[10px]">
                      +{toStringArray(a.requiredSkills).length - 3}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-muted-foreground">
                    {formatDate(a.createdAt)}
                  </span>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={(e) => {
                        e.stopPropagation();
                        openResumeOptimizer(a);
                      }}
                      title="Optimize resume for this JD"
                    >
                      <ExternalLink className="size-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteId(a.id);
                      }}
                      title="Delete"
                    >
                      <Trash2 className="size-3 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((a) => (
            <div
              key={a.id}
              className="flex items-center gap-4 rounded-lg border p-3 cursor-pointer transition-colors hover:border-primary/40"
              onClick={() => setSelectedId(a.id)}
            >
              <div
                className="shrink-0 rounded-md px-2 py-0.5 text-xs font-bold tabular-nums"
                style={{
                  color: scoreColor(a.matchScore ?? 0),
                  backgroundColor: `color-mix(in srgb, ${scoreColor(a.matchScore ?? 0)} 12%, transparent)`,
                }}
              >
                {Math.round(a.matchScore ?? 0)}%
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{a.title}</p>
                <p className="text-xs text-muted-foreground">
                  {a.company ?? "Unknown company"} &middot; {formatDate(a.createdAt)}
                </p>
              </div>
              <div className="flex flex-wrap gap-1 max-w-[240px]">
                {toStringArray(a.requiredSkills)
                  .slice(0, 2)
                  .map((s) => (
                    <Badge key={s} variant="secondary" className="text-[10px]">
                      {s}
                    </Badge>
                  ))}
              </div>
              <div className="flex gap-1 shrink-0">
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    openResumeOptimizer(a);
                  }}
                >
                  <ExternalLink className="size-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteId(a.id);
                  }}
                >
                  <Trash2 className="size-3 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {selected && (
        <Dialog open onOpenChange={() => setSelectedId(null)}>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>{selected.title}</DialogTitle>
              {selected.company && (
                <DialogDescription>{selected.company}</DialogDescription>
              )}
            </DialogHeader>
            <ScrollArea className="max-h-[60vh]">
              <MatchReport
                data={{
                  title: selected.title,
                  company: selected.company,
                  matchScore: selected.matchScore,
                  requiredSkills: toStringArray(selected.requiredSkills),
                  preferredSkills: toStringArray(selected.preferredSkills),
                  missingSkills: toStringArray(selected.missingSkills),
                  recommendations: toStringArray(selected.recommendations),
                }}
              />
            </ScrollArea>
            <DialogFooter>
              <DialogClose
                render={<Button variant="outline" size="sm" />}
              >
                Close
              </DialogClose>
              <Button
                size="sm"
                onClick={() => {
                  setSelectedId(null);
                  openResumeOptimizer(selected);
                }}
              >
                <ExternalLink className="mr-1.5 size-3.5" />
                Optimize Resume
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Analysis</DialogTitle>
            <DialogDescription>
              This action cannot be undone. The analysis will be permanently
              removed from your library.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose
              render={<Button variant="outline" size="sm" />}
            >
              Cancel
            </DialogClose>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
