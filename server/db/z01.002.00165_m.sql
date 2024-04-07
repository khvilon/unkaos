ALTER TABLE public.boards ADD COLUMN color_field_uuid uuid;
ALTER TABLE ONLY public.boards
    ADD CONSTRAINT fk_boards_to_color_field FOREIGN KEY (color_field_uuid) REFERENCES public.fields(uuid) NOT VALID;