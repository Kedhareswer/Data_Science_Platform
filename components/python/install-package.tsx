"use client"

import { useId, useState } from "react"
import { Loader2, Package } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { getPythonRuntime } from "@/lib/python/client"

const PACKAGE_NAME = /^[A-Za-z0-9][A-Za-z0-9._-]*(\[[A-Za-z0-9,._-]+\])?([<>=!~]=?[A-Za-z0-9.*+-]+)?$/

/** Popover that installs pure-Python wheels (or Pyodide packages) through micropip. */
export function InstallPackage({ disabled }: { disabled?: boolean }) {
  const inputId = useId()
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState("")
  const [installing, setInstalling] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const install = async (event: React.FormEvent) => {
    event.preventDefault()
    const packages = value.split(/[\s,]+/).filter(Boolean)
    if (packages.length === 0) return
    const invalid = packages.find((p) => !PACKAGE_NAME.test(p))
    if (invalid) {
      setError(`“${invalid}” doesn't look like a package name.`)
      return
    }
    setInstalling(true)
    setError(null)
    try {
      await getPythonRuntime().install(packages)
      toast.success(`Installed ${packages.join(", ")}`)
      setValue("")
      setOpen(false)
    } catch (err) {
      const message = err instanceof Error ? err.message : "Installation failed"
      setError(message)
      toast.error("Could not install package", { description: message })
    } finally {
      setInstalling(false)
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" disabled={disabled} className="font-handwritten">
          <Package aria-hidden="true" />
          Install
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80">
        <form onSubmit={install} className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor={inputId} className="font-handwritten-bold">
              Install a Python package
            </Label>
            <p className="text-xs text-muted-foreground">
              Uses micropip. Works for pure-Python wheels from PyPI and packages bundled with Pyodide.
            </p>
          </div>
          <Input
            id={inputId}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="e.g. statsmodels tabulate"
            className="font-mono"
            autoComplete="off"
            spellCheck={false}
            disabled={installing}
            aria-invalid={error ? true : undefined}
          />
          {error && (
            <p role="alert" className="text-xs text-destructive">
              {error}
            </p>
          )}
          <Button type="submit" size="sm" className="w-full" disabled={installing || !value.trim()}>
            {installing ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Package aria-hidden="true" />}
            {installing ? "Installing…" : "Install"}
          </Button>
        </form>
      </PopoverContent>
    </Popover>
  )
}
