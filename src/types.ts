export type Page = {
    slug: string;
    title: string;
    summary: string | null;
    parent_slug: string | null;
    section_key: string | null;
    created_at?: string | null;
    updated_at?: string | null;
};

export type SectionRow = {
    key: string;
    name: string;
    icon: string | null;
    image_name: string | null;
    sort_order: number | null;
};

export type Person = {
    slug: string;
    first_name: string;
    last_name: string;
    job_title: string;
    photo_url: string | null;
};

export type Category = {
    key: string;
    name: string;
    icon: string;
    imageName: string | null;
    pages: Page[];
};
