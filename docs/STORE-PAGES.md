# Store pages and navigation

Open **Online store → Edit storefront → Pages & navigation**.

- Every template starts with editable Products and Our story pages. Department names in its header, such as Fish, Plants or Laptops, are real category pages.
- The header and footer use published pages marked **Show in navigation**. Use the arrows to change their order. There is no separate list of menu links to maintain.
- Choose **Add a page → Start with** to create a blank, story, contact or product-category page. A contact starter supplies editable contact text; it does not send contact-form messages.
- A category page shows only that category's products. Pick an existing product category or enter the category you will assign to products. Matching ignores letter case.
- New pages are drafts. Select **Publish** before they appear in the live navigation or can be opened by customers.
- To change a button or tile destination, select its section and choose **Page** from the dropdown. It lists the store's pages, including drafts with a publishing reminder.
- Hero banners, featured product collections and campaign slides support adding/removing buttons. Tile-based sections support adding/removing/reordering tiles. Image with text sections keep their image and text controls.
- Hide a page from navigation without deleting it when you still want buttons to link to it. Other than the core Home and Products pages, pages can be deleted after opening another page in the editor. Update any buttons or tiles that pointed to a deleted page.
- Template previews also support navigating between their example pages. Shopping remains disabled in previews.

Pages, preset generation, navigation and button handling use shared code in `packages/core`. Templates provide the initial content and visual theme. Customer accounts and Google sign-in are also shared; see [customer sign-in setup](CUSTOMER-GOOGLE-SIGN-IN.md).

## Existing installations

Apply pending migrations and regenerate the database client, then run:

```sh
node --import tsx scripts/prepare-store-pages.mjs
```

This adds missing template pages once and preserves existing draft and published sections. Later page deletions are respected. The local development database has already been migrated and prepared for this change. Future editor visits also run the idempotent preparation step.

If a published section still refers to a deleted or unpublished custom page, the storefront sends that link to Products. Update the button or tile in the editor to choose its new destination.
