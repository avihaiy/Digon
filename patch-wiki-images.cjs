const fs = require('fs');
let code = fs.readFileSync('src/pages/fishing/Wiki.tsx', 'utf8');

code = code.replace(
  /<img\s+src=\{fish\.image\}\s+alt=\{fish\.name\}\s+className="w-full h-full object-cover relative z-10 group-hover:scale-105 transition-transform duration-500"\s+onError=\{\(e\) => \{ e\.currentTarget\.style\.display = 'none'; \}\}\s+\/>/g,
  \`<img 
                      src={fish.image} 
                      alt={fish.name} 
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover relative z-10 group-hover:scale-105 transition-transform duration-500"
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    />\`
);

fs.writeFileSync('src/pages/fishing/Wiki.tsx', code);
