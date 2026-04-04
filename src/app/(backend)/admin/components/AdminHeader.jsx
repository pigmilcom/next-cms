'use client'; 

// AdminHeader: title, description, actions area
export default function AdminHeader({ title, description, children }) {
    return (
        <div className="flex flex-col lg:flex-row lg:flex-wrap items-start justify-between gap-2">
            <div className="w-full md:max-w-sm">
                <h1 className="font-bold text-2xl">{title}</h1>
                {description && <p className="text-muted-foreground">{description}</p>}
            </div>
            <div className="flex flex-wrap gap-2">{children}</div>
        </div>
    );
}
