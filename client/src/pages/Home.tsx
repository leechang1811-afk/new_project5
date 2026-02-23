import { Zap, Shield, Rocket } from "lucide-react";
import { ContactForm } from "@/components/ContactForm";

const features = [
  {
    icon: Zap,
    title: "Lightning Fast",
    description: "Built with modern technologies for blazing performance and instant load times.",
  },
  {
    icon: Shield,
    title: "Secure by Default",
    description: "Enterprise-grade security with encrypted data and best practices built in.",
  },
  {
    icon: Rocket,
    title: "Easy to Scale",
    description: "Grow from prototype to production seamlessly with our flexible architecture.",
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center">
              <Zap className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg" data-testid="text-brand">AppName</span>
          </div>
          <nav className="flex items-center gap-6">
            <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors" data-testid="link-features">Features</a>
            <a href="#contact" className="text-sm text-muted-foreground hover:text-foreground transition-colors" data-testid="link-contact">Contact</a>
          </nav>
        </div>
      </header>

      <section className="py-24 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 text-sm px-4 py-1.5 rounded-full border border-border bg-muted/50 text-muted-foreground mb-6" data-testid="badge-launch">
            <span className="w-2 h-2 rounded-full bg-primary" />
            Now Available
          </div>
          <h1 className="text-5xl font-extrabold tracking-tight leading-tight" data-testid="text-hero-title">
            Build Something{" "}
            <span className="text-primary">Amazing</span>
          </h1>
          <p className="mt-4 text-lg text-muted-foreground max-w-xl mx-auto" data-testid="text-hero-description">
            A modern full-stack web application built with React, Tailwind CSS, and a PostgreSQL backend. Fast, secure, and ready to grow with you.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <a
              href="#contact"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-md bg-primary text-primary-foreground font-semibold hover:opacity-90 transition-opacity"
              data-testid="button-get-started"
            >
              Get Started
              <Rocket className="w-4 h-4" />
            </a>
            <a
              href="#features"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-md border border-border bg-card text-foreground font-semibold hover:bg-muted transition-colors"
              data-testid="button-learn-more"
            >
              Learn More
            </a>
          </div>
        </div>
      </section>

      <section id="features" className="py-20 px-6 bg-muted/30">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold tracking-tight" data-testid="text-features-title">Why Choose Us</h2>
            <p className="mt-2 text-muted-foreground">Everything you need to build and ship fast.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {features.map((feature, idx) => (
              <div
                key={feature.title}
                className="rounded-md border border-border bg-card p-6 hover-elevate"
                data-testid={`card-feature-${idx}`}
              >
                <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center mb-4">
                  <feature.icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-semibold text-lg" data-testid={`text-feature-title-${idx}`}>{feature.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed" data-testid={`text-feature-desc-${idx}`}>
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="contact" className="py-20 px-6">
        <div className="max-w-lg mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold tracking-tight" data-testid="text-contact-title">Get in Touch</h2>
            <p className="mt-2 text-muted-foreground">Have a question or want to work together? Drop us a message.</p>
          </div>
          <div className="rounded-md border border-border bg-card p-6" data-testid="form-contact-wrapper">
            <ContactForm />
          </div>
        </div>
      </section>

      <footer className="border-t border-border py-8 px-6">
        <div className="max-w-6xl mx-auto text-center text-sm text-muted-foreground" data-testid="text-footer">
          Built with React & Tailwind CSS
        </div>
      </footer>
    </div>
  );
}
