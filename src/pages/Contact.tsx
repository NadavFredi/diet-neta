import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Mail, MapPin, Phone } from "lucide-react";
import { useContactPage } from './Contact';
import { StyledActionButton } from "@/components/ui/StyledActionButton";

const Contact = () => {
  const { formData, handleSubmit, handleChange } = useContactPage();

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <Navigation />
      
      <div className="pt-24 pb-16 px-6">
        <div className="container mx-auto max-w-6xl">
          {/* Styled Action Button */}
          <div className="mb-8">
            <StyledActionButton
              onClick={() => window.location.href = '/about'}
              icon={Mail}
              label="אודות"
              variant="default"
              active={false}
            />
          </div>
          {/* Header */}
          <div className="text-center mb-16 animate-fade-up">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">צור קשר</h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              יש לך שאלה או רוצה לעבוד יחד? נשמח לשמוע ממך.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-12">
            {/* Contact Form */}
            <Card className="animate-fade-in border-0 card-shadow">
              <CardHeader>
                <CardTitle>שלח לנו הודעה</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <Label htmlFor="name">שם</Label>
                    <Input
                      id="name"
                      name="name"
                      type="text"
                      value={formData.name}
                      onChange={handleChange}
                      required
                      className="mt-1"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="email">אימייל</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      className="mt-1"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="message">הודעה</Label>
                    <Textarea
                      id="message"
                      name="message"
                      rows={4}
                      value={formData.message}
                      onChange={handleChange}
                      required
                      className="mt-1 resize-none"
                    />
                  </div>
                  
                  <Button type="submit" className="w-full">
                    שלח הודעה
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Contact Information */}
            <div className="space-y-8 animate-fade-in">
              <div>
                <h2 className="text-2xl font-bold mb-6">פרטי יצירת קשר</h2>
                <p className="text-muted-foreground leading-relaxed">
                  מוכן להתחיל את הפרויקט שלך? צור איתנו קשר ובואו ניצור משהו מדהים יחד.
                </p>
              </div>

              <div className="space-y-6">
                {[
                  {
                    icon: <Mail className="h-6 w-6 text-primary" />,
                    title: "אימייל",
                    value: "hello@simpleweb.dev",
                    description: "שלח לנו אימייל בכל עת"
                  },
                  {
                    icon: <Phone className="h-6 w-6 text-primary" />,
                    title: "טלפון",
                    value: "03-1234567",
                    description: "התקשר אלינו בשעות העבודה"
                  },
                  {
                    icon: <MapPin className="h-6 w-6 text-primary" />,
                    title: "מיקום",
                    value: "תל אביב, ישראל",
                    description: "בקר במשרד שלנו"
                  }
                ].map((contact, index) => (
                  <Card key={index} className="hover:card-shadow-hover transition-all duration-300 border-0 card-shadow">
                    <CardContent className="pt-6">
                      <div className="flex items-start space-x-4 space-x-reverse">
                        <div className="flex-shrink-0">
                          {contact.icon}
                        </div>
                        <div>
                          <h3 className="font-semibold">{contact.title}</h3>
                          <p className="text-foreground font-medium">{contact.value}</p>
                          <p className="text-sm text-muted-foreground">{contact.description}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Contact;
