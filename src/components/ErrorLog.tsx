import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { X, AlertCircle, Info, CheckCircle } from "lucide-react";

export interface LogEntry {
  id: string;
  timestamp: Date;
  type: "error" | "info" | "success";
  message: string;
  details?: any;
}

class Logger {
  private logs: LogEntry[] = [];
  private listeners: ((logs: LogEntry[]) => void)[] = [];

  log(type: LogEntry["type"], message: string, details?: any) {
    const entry: LogEntry = {
      id: Date.now().toString() + Math.random(),
      timestamp: new Date(),
      type,
      message,
      details,
    };

    this.logs.unshift(entry);
    if (this.logs.length > 50) this.logs = this.logs.slice(0, 50);

    this.notifyListeners();

    // Also log to console
    const prefix = `[${type.toUpperCase()}]`;
    if (type === "error") console.error(prefix, message, details);
    else if (type === "info") console.log(prefix, message, details);
    else console.log(prefix, message, details);
  }

  error(message: string, details?: any) {
    this.log("error", message, details);
  }

  info(message: string, details?: any) {
    this.log("info", message, details);
  }

  success(message: string, details?: any) {
    this.log("success", message, details);
  }

  subscribe(listener: (logs: LogEntry[]) => void) {
    this.listeners.push(listener);
    listener(this.logs);
  }

  unsubscribe(listener: (logs: LogEntry[]) => void) {
    this.listeners = this.listeners.filter((l) => l !== listener);
  }

  private notifyListeners() {
    this.listeners.forEach((listener) => listener([...this.logs]));
  }

  clear() {
    this.logs = [];
    this.notifyListeners();
  }
}

export const logger = new Logger();

export default function ErrorLog() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    logger.subscribe(setLogs);
    return () => logger.unsubscribe(setLogs);
  }, []);

  const errorCount = logs.filter((l) => l.type === "error").length;

  if (!isOpen && errorCount === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {!isOpen ? (
        <Button
          variant="destructive"
          size="sm"
          onClick={() => setIsOpen(true)}
          className="shadow-lg"
        >
          <AlertCircle className="h-4 w-4 mr-2" />
          {errorCount} Error{errorCount !== 1 ? "s" : ""}
        </Button>
      ) : (
        <Card className="w-96 shadow-xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">API Logs</CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => logger.clear()}>
                Clear
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-96">
              {logs.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No logs yet
                </p>
              ) : (
                <div className="space-y-2">
                  {logs.map((log) => (
                    <div key={log.id} className="border rounded p-2 text-sm">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <Badge
                          variant={
                            log.type === "error"
                              ? "destructive"
                              : log.type === "success"
                              ? "default"
                              : "secondary"
                          }
                          className="text-xs"
                        >
                          {log.type === "error" && (
                            <AlertCircle className="h-3 w-3 mr-1" />
                          )}
                          {log.type === "info" && (
                            <Info className="h-3 w-3 mr-1" />
                          )}
                          {log.type === "success" && (
                            <CheckCircle className="h-3 w-3 mr-1" />
                          )}
                          {log.type}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {log.timestamp.toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="text-sm font-medium">{log.message}</p>
                      {log.details && (
                        <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-x-auto">
                          {JSON.stringify(log.details, null, 2)}
                        </pre>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
