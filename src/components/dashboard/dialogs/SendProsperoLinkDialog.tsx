/**
 * SendProsperoLinkDialog Component
 * 
 * Dialog for sending Prospero proposal link via WhatsApp
 */

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Loader2, Copy, Check } from 'lucide-react';
import { sendWhatsAppMessage } from '@/services/greenApiService';
import { useToast } from '@/hooks/use-toast';

interface SendProsperoLinkDialogProps {
  isOpen: boolean;
  onClose: () => void;
  prosperoLink: string;
  leadPhone: string;
  leadName: string;
}

const DEFAULT_PROPOSAL_TEMPLATE = `שלום {{name}},

ההצעה שלך מוכנה!

לצפייה בהצעה:
{{proposal_link}}

בברכה,
צוות DietNeta`;

export const SendProsperoLinkDialog: React.FC<SendProsperoLinkDialogProps> = ({
  isOpen,
  onClose,
  prosperoLink,
  leadPhone,
  leadName,
}) => {
  const { toast } = useToast();
  const [message, setMessage] = useState(DEFAULT_PROPOSAL_TEMPLATE);
  const [phone, setPhone] = useState(leadPhone);
  const [isSending, setIsSending] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(prosperoLink);
      setCopied(true);
      toast({
        title: 'הועתק',
        description: 'הקישור הועתק ללוח',
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({
        title: 'שגיאה',
        description: 'לא ניתן להעתיק את הקישור',
        variant: 'destructive',
      });
    }
  };

  const handleSend = async () => {
    if (!phone) {
      toast({
        title: 'שגיאה',
        description: 'נא להזין מספר טלפון',
        variant: 'destructive',
      });
      return;
    }

    setIsSending(true);
    try {
      // Replace placeholders in message
      const processedMessage = message
        .replace(/\{\{name\}\}/g, leadName || 'לקוח/ה')
        .replace(/\{\{proposal_link\}\}/g, prosperoLink);

      const result = await sendWhatsAppMessage({
        phoneNumber: phone,
        message: processedMessage,
      });

      if (result.success) {
        toast({
          title: 'נשלח בהצלחה',
          description: 'הקישור נשלח ללקוח ב-WhatsApp',
        });
        onClose();
      } else {
        toast({
          title: 'שגיאה',
          description: result.error || 'נכשל בשליחת ההודעה',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      toast({
        title: 'שגיאה',
        description: error?.message || 'נכשל בשליחת ההודעה',
        variant: 'destructive',
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>שלח קישור Prospero</DialogTitle>
          <DialogDescription>
            שלח את קישור ההצעה ללקוח באמצעות WhatsApp
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="prospero-link">קישור ההצעה</Label>
            <div className="flex gap-2">
              <Input
                id="prospero-link"
                value={prosperoLink}
                readOnly
                className="flex-1 font-mono text-xs"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handleCopyLink}
                className="flex-shrink-0"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">מספר טלפון</Label>
            <Input
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="05X-XXXXXXX"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">הודעה</Label>
            <textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full min-h-[120px] px-3 py-2 text-sm border border-input bg-background rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="הזן את תוכן ההודעה..."
            />
            <p className="text-xs text-muted-foreground">
              משתנים זמינים: {'{'}name{'}'}, {'{'}proposal_link{'}'}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={isSending}>
            ביטול
          </Button>
          <Button type="button" onClick={handleSend} disabled={isSending || !phone}>
            {isSending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                שולח...
              </>
            ) : (
              'שלח'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
