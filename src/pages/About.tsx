
import Navigation from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Heart, Target, Lightbulb } from "lucide-react";

const About = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="pt-24 pb-16 px-6">
        <div className="container mx-auto max-w-4xl">
          {/* Header */}
          <div className="text-center mb-16 animate-fade-up">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">About SimpleWeb</h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Discover the story behind our passion for creating beautiful, functional web experiences.
            </p>
          </div>

          {/* Story Section */}
          <div className="grid lg:grid-cols-2 gap-12 mb-16">
            <div className="animate-fade-in">
              <h2 className="text-2xl font-bold mb-4">Our Story</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                SimpleWeb was born from a simple idea: web design should be both beautiful and accessible. 
                We believe that great design doesn't have to be complicated.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                Our team of designers and developers work tirelessly to create experiences that not only 
                look amazing but also feel intuitive and natural to use.
              </p>
            </div>
            
            <div className="flex items-center justify-center">
              <div className="w-full h-64 bg-gradient-to-br from-primary/20 to-purple-600/20 rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Heart className="h-8 w-8 text-primary" />
                  </div>
                  <p className="text-sm text-muted-foreground">Made with passion</p>
                </div>
              </div>
            </div>
          </div>

          {/* Values Section */}
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: <Target className="h-8 w-8 text-primary" />,
                title: "Purpose-Driven",
                description: "Every design decision serves a clear purpose and enhances user experience.",
                tags: ["Goal-oriented", "User-focused"]
              },
              {
                icon: <Lightbulb className="h-8 w-8 text-primary" />,
                title: "Innovation",
                description: "We embrace new technologies and creative solutions to stay ahead.",
                tags: ["Creative", "Forward-thinking"]
              },
              {
                icon: <Heart className="h-8 w-8 text-primary" />,
                title: "Quality",
                description: "We never compromise on quality, ensuring every project exceeds expectations.",
                tags: ["Excellence", "Attention to detail"]
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
