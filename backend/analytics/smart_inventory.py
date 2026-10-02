import json
import math
import sys
from collections import defaultdict
from datetime import datetime, timezone

try:
    import pandas as pd  # type: ignore
except Exception:  # pragma: no cover - optional dependency
    pd = None

try:
    import numpy as np  # type: ignore
except Exception:  # pragma: no cover - optional dependency
    np = None


OUT_TYPES = {"STOCK_OUT", "SALE", "DAMAGED", "LOST", "ADJUSTMENT_OUT"}
SALE_TYPES = {"STOCK_OUT", "SALE"}


def parse_date(value):
    if not value:
        return None
    text = str(value).replace("Z", "+00:00")
    try:
        return datetime.fromisoformat(text)
    except ValueError:
        return None


def paise_to_rupees(value):
    return round((value or 0) / 100, 2)


def build_report(payload):
    products = payload.get("products", [])
    transactions = payload.get("transactions", [])
    today = datetime.now(timezone.utc)

    sold_by_product = defaultdict(int)
    sold_30_by_product = defaultdict(int)
    movement_days_by_product = defaultdict(set)
    revenue_by_product = defaultdict(int)
    category_totals = defaultdict(
        lambda: {
            "categoryId": "",
            "categoryName": "Uncategorized",
            "serialNumber": None,
            "productCount": 0,
            "stockUnits": 0,
            "totalCostPaise": 0,
            "sellingTotalPaise": 0,
            "profitPaise": 0,
            "soldUnits": 0,
        }
    )

    product_lookup = {str(product.get("_id")): product for product in products}

    for tx in transactions:
        product_id = str(tx.get("productId") or "")
        qty = abs(int(tx.get("quantityDelta") or 0))
        tx_type = tx.get("type")
        created = parse_date(tx.get("createdAt"))
        if not product_id or qty == 0 or tx_type not in OUT_TYPES:
            continue

        sold_by_product[product_id] += qty
        if created:
            movement_days_by_product[product_id].add(created.date().isoformat())
            if (today - created).days <= 30:
                sold_30_by_product[product_id] += qty

        product = product_lookup.get(product_id)
        if product and tx_type in SALE_TYPES:
            revenue_by_product[product_id] += qty * int(product.get("sellingPricePerUnitPaise") or 0)

    product_reports = []

    for product in products:
        product_id = str(product.get("_id"))
        category = product.get("categoryId") or {}
        if not isinstance(category, dict):
            category = {}

        current_qty = int(product.get("currentQuantity") or 0)
        reorder_level = int(product.get("reorderLevel") or 0)
        cost = int(product.get("costPerUnitPaise") or 0)
        selling = int(product.get("sellingPricePerUnitPaise") or 0)
        total_cost = current_qty * cost
        selling_total = current_qty * selling
        profit = selling_total - total_cost

        sold_total = sold_by_product[product_id]
        sold_30 = sold_30_by_product[product_id]
        active_days = max(1, len(movement_days_by_product[product_id]))
        avg_daily_sales = sold_total / active_days if sold_total > 0 else 0
        avg_daily_30 = sold_30 / 30 if sold_30 > 0 else avg_daily_sales
        predicted_30 = int(math.ceil(avg_daily_30 * 30))
        days_cover = None if avg_daily_30 <= 0 else round(current_qty / avg_daily_30, 1)
        target_stock = int(math.ceil((avg_daily_30 * 14) + reorder_level))
        reorder_qty = max(0, target_stock - current_qty)

        if current_qty == 0:
            risk = "OUT_OF_STOCK"
            action = "Restock before accepting more orders."
        elif reorder_qty > 0:
            risk = "REORDER_SOON"
            action = f"Order {reorder_qty} more units."
        elif sold_total == 0:
            risk = "SLOW_MOVING"
            action = "No delivery history yet. Watch sales before buying more."
        else:
            risk = "HEALTHY"
            action = "Stock level looks healthy."

        product_report = {
            "productId": product_id,
            "name": product.get("name"),
            "categoryName": category.get("name") or "Uncategorized",
            "serialNumber": category.get("serialNumber"),
            "stockUnits": current_qty,
            "costToCompanyPaise": cost,
            "sellingPricePaise": selling,
            "totalCostPaise": total_cost,
            "sellingTotalPaise": selling_total,
            "profitPaise": profit,
            "soldUnits": sold_total,
            "soldUnits30Days": sold_30,
            "predicted30DaySales": predicted_30,
            "averageDailySales": round(avg_daily_30, 2),
            "daysOfStockCover": days_cover,
            "reorderSuggestion": reorder_qty,
            "risk": risk,
            "action": action,
            "salesValuePaise": revenue_by_product[product_id],
        }
        product_reports.append(product_report)

        category_id = str(category.get("_id") or "uncategorized")
        cat = category_totals[category_id]
        cat["categoryId"] = category_id
        cat["categoryName"] = category.get("name") or "Uncategorized"
        cat["serialNumber"] = category.get("serialNumber")
        cat["productCount"] += 1
        cat["stockUnits"] += current_qty
        cat["totalCostPaise"] += total_cost
        cat["sellingTotalPaise"] += selling_total
        cat["profitPaise"] += profit
        cat["soldUnits"] += sold_total

    product_reports.sort(
        key=lambda item: (item["soldUnits"], item["salesValuePaise"], item["profitPaise"]),
        reverse=True,
    )

    category_reports = list(category_totals.values())
    category_reports.sort(
        key=lambda item: (
            item["serialNumber"] if item["serialNumber"] is not None else 999999,
            item["categoryName"],
        )
    )

    total_cost = sum(item["totalCostPaise"] for item in product_reports)
    total_selling = sum(item["sellingTotalPaise"] for item in product_reports)
    total_profit = total_selling - total_cost
    total_units = sum(item["stockUnits"] for item in product_reports)
    predicted_units = sum(item["predicted30DaySales"] for item in product_reports)
    reorder_count = sum(1 for item in product_reports if item["reorderSuggestion"] > 0)

    return {
        "engine": "python",
        "libraries": {
            "pandas": bool(pd),
            "numpy": bool(np),
        },
        "summary": {
            "productCount": len(product_reports),
            "categoryCount": len(category_reports),
            "stockUnits": total_units,
            "totalCostPaise": total_cost,
            "sellingTotalPaise": total_selling,
            "profitPaise": total_profit,
            "predicted30DaySales": predicted_units,
            "reorderProducts": reorder_count,
        },
        "bestSellers": product_reports[:5],
        "products": product_reports,
        "categories": category_reports,
        "generatedAt": today.isoformat(),
    }


def main():
    payload = json.loads(sys.stdin.read() or "{}")
    print(json.dumps(build_report(payload), separators=(",", ":")))


if __name__ == "__main__":
    main()
