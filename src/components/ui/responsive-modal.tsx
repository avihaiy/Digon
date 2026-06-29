import * as React from "react"
import { useIsMobile } from "@/hooks/use-mobile"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer"

export function ResponsiveModal({ 
  open, 
  onOpenChange, 
  title, 
  icon: Icon,
  children 
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: React.ReactNode;
  icon?: any;
  children: React.ReactNode;
}) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange} shouldScaleBackground={false}>
        <DrawerContent className="max-h-[96dvh]">
          <DrawerHeader className="text-right border-b pb-4 mb-4">
            <DrawerTitle className="flex items-center gap-2 justify-start">
              {Icon && <Icon className="w-5 h-5" />}
              {title}
            </DrawerTitle>
          </DrawerHeader>
          <div className="overflow-y-auto pb-[calc(env(safe-area-inset-bottom)+1rem)] px-4">
            {children}
          </div>
        </DrawerContent>
      </Drawer>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md w-[calc(100vw-1.5rem)] max-h-[90dvh] overflow-y-auto pb-[calc(env(safe-area-inset-bottom)+1rem)]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {Icon && <Icon className="w-5 h-5" />}
            {title}
          </DialogTitle>
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  )
}
