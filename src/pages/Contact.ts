import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

export const useContactPage = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: ''
  });
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast({
      title: "ההודעה נשלחה!",
      description: "תודה על הודעתך. נחזור אליך בקרוב.",
    });
    setFormData({ name: '', email: '', message: '' });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  return {
    formData,
    handleSubmit,
    handleChange,
  };
};























