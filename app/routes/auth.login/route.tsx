import { useState } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { Form, useActionData, useLoaderData } from "react-router";

import { login } from "../../shopify.server";
import { loginErrorMessage } from "./error.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const errors = loginErrorMessage(await login(request));

  return { errors };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const errors = loginErrorMessage(await login(request));

  return {
    errors,
  };
};

export default function Auth() {
  const loaderData = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const [shop, setShop] = useState("");
  const { errors } = actionData || loaderData;

  return (
    <main style={{ maxWidth: 420, margin: "3rem auto", padding: "0 1rem" }}>
      <h1>Log in</h1>
      <Form method="post">
        <label htmlFor="shop">Shop domain</label>
        <input
          id="shop"
          name="shop"
          type="text"
          placeholder="example.myshopify.com"
          value={shop}
          onChange={(e) => setShop(e.currentTarget.value)}
          autoComplete="on"
          style={{
            display: "block",
            width: "100%",
            marginTop: "0.5rem",
            marginBottom: "0.5rem",
            padding: "0.5rem",
          }}
        />
        {errors.shop ? (
          <p style={{ color: "#b42318", marginTop: 0 }}>{errors.shop}</p>
        ) : null}
        <button type="submit">Log in</button>
      </Form>
    </main>
  );
}
