import Navigation from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Heart, Target, Lightbulb } from "lucide-react";
import { useAboutPage } from './About';
import { StyledActionButton } from "@/components/ui/StyledActionButton";

const About = () => {
  useAboutPage(); // For consistency with pattern

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <Navigation />
      
      <div className="pt-24 pb-16 px-6">
        <div className="container mx-auto max-w-4xl">
          {/* Styled Action Button */}
          <div className="mb-8">
            <StyledActionButton
              onClick={() => window.location.href = '/contact'}
              icon={Heart}
              label="צור קשר"
              variant="default"
              active={false}
            />
          </div>
          {/* Header */}
          <div className="text-center mb-16 animate-fade-up">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">אודות SimpleWeb</h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              גלו את הסיפור מאחורי התשוקה שלנו ליצור חוויות אינטרנט יפות ופונקציונליות.
            </p>
          </div>

          {/* Story Section */}
          <div className="grid lg:grid-cols-2 gap-12 mb-16">
            <div className="animate-fade-in">
              <h2 className="text-2xl font-bold mb-4">הסיפור שלנו</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                SimpleWeb נולד מרעיון פשוט: עיצוב אתרים צריך להיות גם יפה וגם נגיש. 
                אנחנו מאמינים שעיצוב מעולה לא חייב להיות מסובך.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                הצוות שלנו של מעצבים ומפתחים עובד ללא לאות כדי ליצור חוויות שלא רק 
                נראות מדהימות אלא גם מרגישות אינטואיטיביות וטבעיות לשימוש.
              </p>
            </div>
            
            <div className="flex items-center justify-center">
              <div className="w-full h-64 bg-gradient-to-br from-primary/20 to-purple-600/20 rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Heart className="h-8 w-8 text-primary" />
                  </div>
                  <p className="text-sm text-muted-foreground">נוצר בתשוקה</p>
                </div>
              </div>
            </div>
          </div>

          {/* Values Section */}
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: <Target className="h-8 w-8 text-primary" />,
                title: "מונע מטרה",
                description: "כל החלטת עיצוב משרתת מטרה ברורה ומשפרת את חוויית המשתמש.",
                tags: ["ממוקד מטרה", "ממוקד משתמש"]
              },
              {
                icon: <Lightbulb className="h-8 w-8 text-primary" />,
                title: "חדשנות",
                description: "אנחנו מאמצים טכנולוגיות חדשות ופתרונות יצירתיים כדי להישאר בחזית.",
                tags: ["יצירתי", "חושב קדימה"]
              },
              {
                icon: <Heart className="h-8 w-8 text-primary" />,
                title: "איכות",
                description: "אנחנו לעולם לא מתפשרים על איכות, ומבטיחים שכל פרויקט עולה על הציפיות.",
                tags: ["מצוינות", "תשומת לב לפרטים"]
              }
            ].map((value, index) => (
              <Card key={index} className="hover:card-shadow-hover transition-all duration-300 animate-fade-in border-0 card-shadow">
                <CardHeader>
                  <div className="flex justify-center mb-4">
                    {value.icon}
                  </div>
                  <CardTitle className="text-center">{value.title}</CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <p className="text-muted-foreground mb-4">{value.description}</p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {value.tags.map((tag, tagIndex) => (
                      <Badge key={tagIndex} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default About;
