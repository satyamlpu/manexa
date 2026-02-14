import manexaLogo from "@/assets/manexa-logo.svg";

const footerLinks = [
  { title: "Product", links: ["Features", "Pricing", "Demo", "Changelog"] },
  { title: "Company", links: ["About", "Blog", "Careers", "Contact"] },
  { title: "Legal", links: ["Privacy", "Terms", "Security"] },
];

const Footer = () => (
  <footer id="contact" className="bg-card border-t border-border py-16">
    <div className="container mx-auto px-4 lg:px-8">
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
        <div>
          <img src={manexaLogo} alt="Manexa Logo" className="h-10 w-auto mb-4" />
          <p className="text-sm text-muted-foreground leading-relaxed">
            AI-powered unified school and college management platform.
          </p>
        </div>
        {footerLinks.map((group) => (
          <div key={group.title}>
            <h4 className="font-semibold mb-4 text-sm">{group.title}</h4>
            <ul className="space-y-2.5">
              {group.links.map((link) => (
                <li key={link}>
                  <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    {link}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-border pt-8 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} Manexa. All rights reserved.
      </div>
    </div>
  </footer>
);

export default Footer;
