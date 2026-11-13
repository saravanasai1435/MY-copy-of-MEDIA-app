import { motion, useReducedMotion } from 'motion/react';
import { ArrowUpRight, Code2 } from 'lucide-react';
import { DEV_PROJECTS } from '../constants/devProjects';
import { PulsrLogo } from './PulsrLogo';

export function ByDevPage() {
  const reducedMotion = useReducedMotion();

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 lg:pt-10 pb-10 flex flex-col min-h-[calc(100vh-5rem)] justify-between space-y-12">
      <div className="space-y-8">
        {/* Header */}
        <header className="flex flex-col items-start space-y-3">
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-pink-500">
            <Code2 className="w-4 h-4" />
            <span>By DEV</span>
          </div>

          <div className="relative inline-block">
            <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight [text-wrap:balance]">
              Built by Saravanasai
            </h1>
            <motion.div
              initial={reducedMotion ? false : { scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
              style={{ transformOrigin: 'left' }}
              className="mt-2 h-1 w-full rounded-full bg-gradient-to-r from-violet-500 via-pink-500 to-amber-500"
            />
          </div>

          <p className="text-base text-slate-600 dark:text-slate-400">
            More things I&apos;ve made
          </p>
        </header>

        {/* Responsive 1 -> 2 -> 3 column grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {DEV_PROJECTS.map((project, index) => (
            <motion.div
              key={project.id}
              initial={reducedMotion ? false : { opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.38,
                delay: index * 0.07,
                ease: [0.16, 1, 0.3, 1],
              }}
              whileHover={
                reducedMotion
                  ? undefined
                  : { y: -6, rotateX: 2, rotateY: -2, transition: { duration: 0.2 } }
              }
              style={{ transformPerspective: 900 }}
              className="group relative rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/85 dark:bg-[#12121D]/90 backdrop-blur-xl p-6 flex flex-col justify-between gap-6 shadow-sm hover:shadow-xl hover:shadow-pink-500/10 hover:border-pink-500/40 transition-all"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div
                    className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${project.gradient} text-white font-display font-bold text-base flex items-center justify-center shadow-lg`}
                  >
                    {project.monogram}
                  </div>
                  <span className="text-xs text-slate-400 truncate max-w-[165px]">
                    {project.domainLabel}
                  </span>
                </div>

                <div>
                  <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white group-hover:text-pink-500 transition-colors">
                    {project.name}
                  </h2>
                  <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                    {project.description}
                  </p>
                </div>
              </div>

              <a
                href={project.url}
                target="_blank"
                rel="noopener noreferrer"
                className="h-10 px-4 rounded-xl bg-slate-100 dark:bg-white/10 group-hover:bg-gradient-to-r group-hover:from-violet-600 group-hover:via-pink-600 group-hover:to-amber-500 text-slate-900 dark:text-white group-hover:text-white text-xs font-semibold inline-flex items-center justify-between transition-all"
              >
                <span>Open</span>
                <ArrowUpRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </a>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Footer Strip */}
      <footer className="pt-6 border-t border-slate-200 dark:border-white/10 flex flex-wrap items-center justify-between gap-4">
        <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
          Crafted with code and caffeine by Saravanasai
        </p>
        <PulsrLogo size="sm" />
      </footer>
    </div>
  );
}
